import BasePlugin from '../../utils/base-plugin.js';
import { ZipArchive } from 'archiver';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';

import { RowBuilder } from '../../utils/row-builder.js';

export default class BackupPlugin extends BasePlugin {
    constructor(context) {
        super(context);
    }

    /**
     * Инициализация плагина
     */
    async onLoad() {
        this.context.log('Plugin status: loading');

        this.context.registerCommand('backup', 'Создать бэкап проекта', async () => {
            await this.startBackupProcess();
        });
    }


    async onLoaded() {
        this.context.log('Plugin status: loaded');
    }
    async onDisable() {
        this.context.log('Plugin status: disabling');
    }

    async onDisabled() {
        this.context.log('Plugin status: disabled');
    }

    /**
     * Главная функция, которая выполняет весь процесс создания бэкапа
     */
    async startBackupProcess() {
        const cli = this.context.cli || this.context;
        const chalk = this.context.chalk || (await import('chalk')).default;

        cli.terminal.pause();

        const now = new Date();
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const formatted = now.toLocaleString('ru-RU', options)
            .replace(',', '')           // Убираем запятую
            .replace(/\s+/g, '_')       // Меняем все пробелы на _
            .replace(/:/g, '-');        // Меняем : на -

        const backupPath = path.join(this.context.resolveDir, 'backups', `backup-${formatted}.zip`);


        const blacklist = ['node_modules', 'backups', '.git', '.env', 'dist', 'vendor', '.osp'];

        const builder = new RowBuilder({
            screenWidth: () => cli.terminal.width || 80,
            columns: [
                { width: 18, align: 'left', color: chalk.white }, // Левая колонка (Заголовок)
                { align: 'left', color: chalk.white },            // Центр (Контент / Бар)
                { width: 12, align: 'right', color: chalk.gray }  // Правая колонка (Метрики)
            ]
        });

        try {
            // Этап 1: Сканирование проекта
            let scannedFilesCount = 0;

            const files = await this.getProjectFiles(this.context.resolveDir, blacklist, (currentFile) => {
                scannedFilesCount++;

                const screenWidth = cli.terminal.width || 80;

                // 1. Статус этапа
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = chalk.yellowBright;
                builder.columns[2].color = chalk.magentaBright;
                const line1 = builder.build('Этап выполнения:', `Сканирование каталогов...`, `${scannedFilesCount} ф.`);

                // 2. Текущий проверяемый файл
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = chalk.gray;
                builder.columns[2].color = chalk.gray;
                const line2 = builder.build('Анализ путей:', currentFile, '');

                // 3. Системная память
                const memoryStr = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`;
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = chalk.white;
                builder.columns[2].color = chalk.yellowBright;
                const line3 = builder.build('Статус системы:', 'Калькуляция контрольных сумм и размеров', memoryStr);

                cli.terminal.updateFooter([line1, line2, line3]);
            });

            if (files.list.length === 0) {
                cli.terminal.resume();
                this.context.log(chalk.yellow('Нет файлов для архивации.'));
                cli.terminal.updateFooter([]);
                return;
            }

            // Этап 2: Архивирование
            await this.zipFiles(files.list, files.totalBytes, backupPath, (percent, processedMb, activeFile) => {
                const screenWidth = cli.terminal.width || 80;

                // Расчет ширины прогресс-бара под размер экрана: 18 (col1) + 12 (col3) + 2 (разделители) + 2 (скобки) = 34
                const pfgWidth = Math.max(0, screenWidth - 34);
                const filledWidth = Math.round(pfgWidth * (percent / 100));
                const emptyWidth = Math.max(0, pfgWidth - filledWidth);
                const coloredBar = chalk.gray('[') + chalk.magenta('▰').repeat(filledWidth) + chalk.gray('▱').repeat(emptyWidth) + chalk.gray(']');

                // 1. Прогресс бар
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = (text) => text;
                builder.columns[2].color = chalk.magentaBright;
                const line1 = builder.build('Архивация:', coloredBar, `${percent}%`);

                // 2. Текущая задача и файл
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = chalk.white;
                builder.columns[2].color = chalk.bold.cyan;
                const line2 = builder.build('Текущая задача:', 'Сжатие исходного кода проекта и ресурсов...', 'Wisteria');

                // 3. Лента упаковываемых файлов
                builder.columns[0].color = chalk.blueBright;
                builder.columns[1].color = chalk.gray;
                builder.columns[2].color = chalk.yellowBright;
                const line3 = builder.build('Упаковка файла:', activeFile || 'Финализация...', `${processedMb} MB`);

                cli.terminal.updateFooter([line1, line2, line3]);
            });

            cli.terminal.resume();
            cli.terminal.clearFooterData();
            this.context.log(chalk.green(`Бэкап успешно создан: backups/backup-${formatted}.zip (${files.totalMegaBytes} MB)`));

        } catch (err) {
            cli.terminal.resume();
            cli.terminal.clearFooterData();
            this.context.log(chalk.red(`Ошибка при создании бэкапа: ${err.message}`));
        }
    }

    /**
     * Сбор фалов проекта с учетом черного списка
     */
    async getProjectFiles(sourceDir, blacklist, onScanProgress) {
        const filesList = [];
        let totalBytes = 0;

        const entries = await fs.readdir(sourceDir, { recursive: true, withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isFile()) continue;

            const relativePath = path.relative(sourceDir, path.join(entry.parentPath, entry.name));

            if (typeof onScanProgress === 'function') {
                onScanProgress(entry.name);
                if (filesList.length % 50 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }

            const isBlacklisted = blacklist.some(ignored => {
                const normalizedIgnored = path.normalize(ignored);
                return relativePath === normalizedIgnored || relativePath.startsWith(normalizedIgnored + path.sep);
            });

            if (isBlacklisted) continue;

            const fullPath = path.join(entry.parentPath, entry.name);
            const stat = await fs.stat(fullPath);

            totalBytes += stat.size;
            filesList.push({ fullPath, relativePath });
        }

        return {
            list: filesList,
            totalBytes,
            totalMegaBytes: (totalBytes / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * Упаковка файлов в zip
     */
    async zipFiles(files, totalBytes, outPath, onProgress) {
        const outDir = path.dirname(outPath);
        if (!existsSync(outDir)) {
            await fs.mkdir(outDir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const output = createWriteStream(outPath);
            const archive = new ZipArchive({ zlib: { level: 9 } });

            let currentFileInWork = '';

            output.on('close', () => {
                if (typeof onProgress === 'function') {
                    const totalMb = (totalBytes / 1024 / 1024).toFixed(2);
                    onProgress(100, totalMb, 'Завершено');
                }
                resolve();
            });

            archive.on('error', (err) => reject(err));
            archive.on('warning', (err) => {
                if (err.code !== 'ENOENT') console.warn('⚠️ Предупреждение:', err);
            });

            archive.on('entry', (entry) => {
                currentFileInWork = entry.name;
            });

            const progressInterval = setInterval(() => {
                if (typeof onProgress === 'function' && totalBytes > 0) {
                    const processedBytes = output.bytesWritten;
                    const percent = Math.min(Math.round((processedBytes / totalBytes) * 100), 99);
                    const processedMb = (processedBytes / 1024 / 1024).toFixed(2);

                    onProgress(percent, processedMb, currentFileInWork);
                }
            }, 100);

            output.on('close', () => clearInterval(progressInterval));
            archive.on('error', () => clearInterval(progressInterval));

            archive.pipe(output);

            for (const file of files) {
                archive.file(file.fullPath, { name: file.relativePath });
            }

            archive.finalize();
        });
    }
}