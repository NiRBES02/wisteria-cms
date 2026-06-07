import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';

/**
 * Универсальный логгер с поддержкой:
 * - цветного вывода в терминал,
 * - многострочной и структурированной записи (объекты, ошибки),
 * - автоматического форматирования времени,
 * - переноса строк по ширине терминала,
 * - ведения лог-файлов с ротацией (удаление старых записей).
 * 
 * Используется как центральная точка логирования в приложении.
 */
export default class Logger {
    /**
     * Экземпляр логгера.
     * 
     * @param {TerminalInterface} terminalInterface Экземпляр интерфейса терминала для вывода.
     * @param {string} [logDir] Директория для хранения лог-файлов. По умолчанию: `./log/server/`.
     */
    constructor(terminalInterface, logDir = path.join(process.cwd(), 'log', 'server')) {
        this.terminal = terminalInterface;
        this.logDir = logDir;
        
        this._rotateLogs();
        this.logFilePath = this._initLogFile(); 
    }

    /**
     * Инициализирует новый файл лога с уникальным именем.
     * Использует схему: `<индекс>-<дата>-<время>.log`, где индекс увеличивается с каждым запуском.
     * 
     * @returns {string} Полный путь к созданному файлу лога.
     * 
     * @private
     */
    _initLogFile() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        const files = fs.readdirSync(this.logDir);
        let lastIndex = 0;

        files.forEach(file => {
            const match = file.match(/^(\d+)-/);
            if (match) {
                const idx = parseInt(match[1], 10);
                if (idx > lastIndex) lastIndex = idx;
            }
        });

        const currentRunIndex = lastIndex + 1;
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        
        const filePath = path.join(this.logDir, `${currentRunIndex}-${dateStr}-${timeStr}.log`);
        fs.writeFileSync(filePath, '', 'utf8');

        return filePath;
    }

    /**
     * Удаляет лог-файлы старше 7 дней.
     * Помогает избежать переполнения диска.
     * 
     * @private
     */
    _rotateLogs() {
        if (!fs.existsSync(this.logDir)) return;

        const files = fs.readdirSync(this.logDir);
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            const filePath = path.join(this.logDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > weekInMs) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                // NiRBES: Нужно ли сюда добавлять логирование ошибок?
            }
        });
    }

    /**
     * Записывает строку в лог-файл, предварительно убирая ANSI-коды цветов.
     * 
     * @param {string} text Текст для записи (может содержать ANSI-коды).
     * @private
     */
    _writeToFile(text) {
        const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const cleanText = text.replace(ansiRegex, '');
        fs.appendFileSync(this.logFilePath, cleanText + '\n', 'utf8');
    }

    /**
     * Форматирует текущее время в строку вида `[14:30]` с серым цветом.
     * 
     * @returns {string} Цветная строка с временем.
     * @private
     */
    _formatTime() {
        const time = new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return chalk.gray(`[${time}]`);
    }

    /**
     * Основной метод логирования. Поддерживает:
     * - любые типы данных (строки, объекты, ошибки, null и т.д.),
     * - многострочный вывод с переносом по ширине терминала,
     * - красивое форматирование сложных структур (`util.inspect`),
     * - отключение префикса времени с помощью `--no-time`,
     * - автоматическую запись в файл.
     * 
     * @param {...*} args Аргументы для логирования. Специальный флаг `--no-time` убирает время.
     * 
     * @example
     * logger.log('Простое сообщение');
     * logger.log({ name: 'Yuki', active: true });
     * logger.log(errorInstance);
     * logger.log('Сообщение без времени', '--no-time');
     * 
     * @todo Добавить уровни логирования (debug, info, warn, error).
     * @todo Поддержка цветовой темы (настраиваемые цвета).
     * @todo Буферизация и асинхронная запись в файл.
     */
    log(...args) {
        let noTime = false;
        const filteredArgs = args.filter(arg => {
            if (typeof arg === 'string' && arg.trim() === '--no-time') {
                noTime = true;
                return false;
            }
            return true;
        });

        const timeStr = noTime ? '' : this._formatTime();
        const gap = ' ';
        const indent = ' '.repeat(8);

        const rawMessage = filteredArgs.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            }
            return util.inspect(arg, { 
                colors: true, 
                depth: 6,
                breakLength: 60,
                compact: false,
                showHidden: false 
            });
        }).join(' ');

        const manualLines = rawMessage.split('\n');
        const finalLines = [];

        manualLines.forEach(line => {
            const wrapped = wrapAnsi(line, this.terminal.width - indent.length, { 
                hard: true, 
                trim: false 
            });
            finalLines.push(...wrapped.split('\n'));
        });

        let output = '';
        if (noTime) {
            output = finalLines.map(line => indent + line).join('\n');
        } else {
            output = finalLines.map(line => timeStr + gap + line).join('\n');
        }

        this.terminal.writeLog(output);
        this._writeToFile(output);
    }
}
