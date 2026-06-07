import { ConfigManager } from '../utils/config-manager.js';
import { pathToFileURL } from 'node:url';
import { execa } from 'execa';
import path from 'node:path';
import chalk from 'chalk';
import fs from 'node:fs';

/**
 * Имя файла по умолчанию для точки входа плагина, если не указано в конфиге.
 * @type {string}
 * @private
 */
const DEFAULT_ENTRY = 'index.js';

/**
 * Класс-загрузчик плагинов, отвечающий за:
 * - чтение конфигурации плагина,
 * - проверку его состояния (включён/отключён),
 * - загрузку как ES-модуля (`type: module`) или отдельного процесса (`exec`),
 * - поддержку горячей перезагрузки,
 * - корректное завершение работы.
 * 
 * Интегрируется с PluginManager и предоставляет единый интерфейс для управления жизненным циклом плагинов.
 */
export default class PluginLoader {

    /**
     * Экземпляр загрузчика.
     * @param {PluginManager} pluginManager Экземпляр менеджера плагинов, управляющего активными плагинами.
     */
    constructor(pluginManager) {
        this.pm = pluginManager;
    }

    /**
     * Загружает плагин по имени папки.
     * Проверяет наличие `config.json`, его валидность и активность.
     * Поддерживает принудительную перезагрузку (`force`).
     * 
     * @param {string} folderName Имя директории плагина внутри `pluginsDir`.
     * @param {boolean} [force=false] Если `true`, выгружает и перезагружает уже активный плагин.
     * @returns {Promise<void>}
     * 
     * @todo Логировать время загрузки каждого плагина.
     */
    async load(folderName, force = false) {
        const pluginDir = path.join(this.pm.pluginsDir, folderName);
        const configPath = path.join(pluginDir, 'config.json');

        if (!fs.existsSync(configPath)) {
            this.pm.cli.logger.log(`[Loader] Пропущена папка "${folderName}": config.json не найден`);
            return;
        }

        const configManager = new ConfigManager(configPath);
        let config = configManager.get();


        if (!config || !config.enabled) {
            this.pm.cli.logger.log(`[Loader] Плагин в "${folderName}" отключен или невалиден`);
            return;
        }

        if (this.pm.activePlugins.has(config.name)) {
            if (!force) return;
            await this.unload(config.name);
        }

        const pluginInfo = {
            folderName,
            dir: pluginDir,
            config,
            commands: new Set(),
            state: {},
            instance: null,
            stop: null,
            startTime: new Date().toLocaleTimeString('ru-RU'),
        };

        const context = this.pm.createContext(pluginInfo);
        pluginInfo.context = context;
        this.pm.activePlugins.set(config.name, pluginInfo);

        try {
            if (config.type === 'module' || config.module) {
                await this._loadModule(pluginInfo);
            } else if (config.exec) {
                await this._loadProcess(pluginInfo);
            }
        } catch (err) {
            this.pm.activePlugins.delete(config.name);
            this.pm.cli.logger.log(chalk.red(`[Loader] Ошибка инициализации плагина "${config.name}":`), err);
        }
    }

    /**
     * Загружает плагин как ES-модуль (встроенный).
     * Поддерживает три типа экспортов:
     * - класс с методами `onLoad`, `onDisable` и т.д.,
     * - функция-инициализатор (обратная совместимость),
     * - объект с хуками-функциями.
     * 
     * Использует `?t=${Date.now()}` для обхода кэширования модулей при перезагрузке.
     * 
     * @param {Object} pluginInfo Объект с информацией о плагине.
     * @returns {Promise<void>}
     * 
     * @private
     * @todo Поддержка динамического импорта без хака с `?t=`.
     * @todo Проверка типов экспорта с помощью символических ключей.
     */
    async _loadModule(pluginInfo) {
        const entry = pluginInfo.config.module || DEFAULT_ENTRY;
        const pluginFile = path.join(pluginInfo.dir, entry);
        if (!fs.existsSync(pluginFile)) {
            throw new Error(`Файл точки входа не найден: ${pluginFile}`);
        }

        // Хак (фича) с таймстемпом ?t= для обхода кэширования ESM модулей Node.js при горячей перезагрузке
        const moduleUrl = `${pathToFileURL(pluginFile).href}?t=${Date.now()}`;
        const module = await import(moduleUrl);
        const pluginExport = module.default ?? module;

        if (typeof pluginExport === 'function' && pluginExport.prototype?.onLoad) {
            const instance = new pluginExport(pluginInfo.context);
            pluginInfo.instance = instance;

            if (typeof instance.onLoad === 'function') await instance.onLoad();
            if (typeof instance.onLoaded === 'function') await instance.onLoaded();

            pluginInfo.stop = async () => {
                if (typeof instance.onDisable === 'function') await instance.onDisable();
                if (typeof instance.onDisabled === 'function') await instance.onDisabled();
            };
        }
        // Если это старая обычная функция (обратная совместимость для v3)
        else if (typeof pluginExport === 'function') {
            await pluginExport(pluginInfo.context);
        }
        else {
            if (typeof pluginExport.onLoad === 'function') await pluginExport.onLoad(pluginInfo.context);
            if (typeof pluginExport.onLoaded === 'function') await pluginExport.onLoaded(pluginInfo.context);

            pluginInfo.stop = async () => {
                if (typeof pluginExport.onDisable === 'function') await pluginExport.onDisable(pluginInfo.context);
                if (typeof pluginExport.onDisabled === 'function') await pluginExport.onDisabled(pluginInfo.context);
            };
        }
    }

    /**
     * Загружает плагин как отдельный дочерний процесс через `execa`.
     * Настраивает IPC коммуникацию, регистрацию команд и перенаправление логов.
     * 
     * @param {Object} pluginInfo Объект с информацией о плагине.
     * @returns {Promise<void>}
     * 
     * @private
     * @todo Поддержка перезапуска процесса при падении (опция `restart: true`).
     * @todo Ограничение потребления ресурсов (CPU, память).
     */
    async _loadProcess(pluginInfo) {
        const execConfig = pluginInfo.config.exec;
        const subprocess = execa(execConfig.command, execConfig.args || [], {
            reject: false,
            cleanup: true,
            detached: false,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: { ...process.env, ...(execConfig.env || {}) },
        });

        pluginInfo.process = subprocess;
        pluginInfo.stop = async () => {
            if (subprocess.connected) subprocess.send({ type: 'STOP' });
            await this._terminateProcess(subprocess);
        };

        subprocess.on('message', msg => {
            if (msg.type === 'REGISTER_COMMAND') {
                const names = Array.isArray(msg.name) ? msg.name : [msg.name];
                names.forEach(cmd => {
                    this.pm.cli.command(cmd, msg.description, async args => {
                        if (!subprocess.connected) return this.pm.cli.logger.log('Ошибка: подпроцесс плагина мертв');
                        subprocess.send({ type: 'EXECUTE_COMMAND', name: cmd, args });
                    });
                    pluginInfo.commands.add(cmd.toLowerCase());
                });
            }
        });

        subprocess.stdout.on('data', data => this.pm.cli.logger.log(`[${pluginInfo.config.name}] ${data.toString().trim()}`));
        subprocess.stderr.on('data', data => this.pm.cli.logger.log(chalk.red(`[${pluginInfo.config.name}] ${data.toString().trim()}`)));
    }

    /**
     * Корректно завершает дочерний процесс: сначала `SIGINT`, затем при таймауте `SIGKILL`.
     * 
     * @param {ChildProcess} subprocess Дочерний процесс, запущенный через `execa`.
     * @returns {Promise<void>}
     * 
     * @private
     * @todo Добавить опцию настраиваемого таймаута.
     */
    async _terminateProcess(subprocess) {
        try { subprocess.kill('SIGINT'); } catch { }
        const timeout = Date.now() + 3000;
        while (Date.now() < timeout && !subprocess.killed) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (!subprocess.killed) {
            try { subprocess.kill('SIGKILL'); } catch { }
        }
    }

    /**
     * Выгружает активный плагин по имени.
     * Вызывает функцию остановки (`stop`), удаляет команды из реестра и очищает состояние.
     * 
     * Поддерживает поиск по `config.name` или `folderName`.
     * 
     * @param {string} name - Имя плагина (регистронезависимо).
     * @returns {Promise<boolean>} `true`, если плагин был найден и выгружен.
     * 
     * @todo Очистка кэша import при выгрузке модуля.
     * @todo Поддержка событий `onUnload`, `onUnloaded`.
     */
    async unload(name) {
        const targetName = String(name).toLowerCase();
        const pluginInfo = [...this.pm.activePlugins.values()].find(
            p => p.config.name.toLowerCase() === targetName || p.folderName.toLowerCase() === targetName
        );
        if (!pluginInfo) return false;

        try {
            if (typeof pluginInfo.stop === 'function') await pluginInfo.stop();
        } catch (err) {
            this.pm.cli.logger.log(`[Loader] Ошибка при выгрузке ${pluginInfo.config.name}:`, err);
        }

        pluginInfo.commands.forEach(cmd => this.pm.cli.registry.unregister(cmd));
        this.pm.activePlugins.delete(pluginInfo.config.name);
        return true;
    }
}
