import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import PluginLoader from './plugin-loader.js';
import EventBus from './event-bus.js';

/**
 * Менеджер плагинов, отвечающий за загрузку, выгрузку и управление жизненным циклом плагинов.
 * Предоставляет контекст каждому плагину доступ к терминалу,
 * командам CLI, системе событий и взаимодействию между плагинами.
 */
export default class PluginManager {
    /**
     * Экземпляр менеджера плагинов.
     * @param {Object} cli - Экземпляр основного CLI-приложения.
     * @param {string} pluginsDir - Путь к директории с плагинами.
     * @param {string} mainDir - Путь к основной директории приложения.
     */
    constructor(cli, pluginsDir, mainDir) {
        this.cli = cli;
        this.pluginsDir = pluginsDir;
        this.mainDir = mainDir;
        this.activePlugins = new Map();
        this.bus = new EventBus();
        this.loader = new PluginLoader(this);
    }

    /**
     * Создаёт изолированный контекст для плагина, предоставляя ему необходимые инструменты.
     * Включает логирование, регистрацию команд, работу с футером, событиями.
     * @param {Object} pluginInfo Информация о плагине: config, dir, commands.
     * @returns {Object} Контекст, доступный внутри плагина.
     * 
     * NiRBES: Я понимаю что контектст выглядит не внушающе и как-то лениво и что еще за dir/mainDir,
     * но на данный момент в нем пока что все необходимое для работы, и да, в будущем это может стать проблемно при расширении функционала, 
     * но на данный момент я не вижу смысла усложнять его, добавляя туда кучу всяких утилит и методов, которые могут никогда не понадобиться.
     * Поэтому пока что оставим его таким, какой он есть, а там уже по мере необходимости буду дополнять его.
     */
    createContext(pluginInfo) {
        const prefix = pluginInfo.config.hiddenPrefix
            ? ''
            : chalk[pluginInfo.config.color || 'reset'](`[${pluginInfo.config.name}] `);
        const logger = (...args) => {
            if (prefix) {
                if (typeof args[0] === 'string') {
                    args[0] = prefix + args[0];
                } else {
                    args.unshift(prefix);
                }
            }
            this.cli.logger.log(...args);
        };

        return {
            /**
             * Имя плагина.
             * @type {string}
             */
            name: pluginInfo.config.name,

            /**
             * Конфигурация плагина из `plugin.json`.
             * @type {Object}
             */
            config: pluginInfo.config,

            /**
             * Директория плагина.
             * @type {string}
             */
            dir: pluginInfo.dir,

            /**
             * Основная директория приложения.
             * @type {string}
             * 
             * NiRBES: Задумывалась как resolveDir, я еще не определился, подумаю на досуге когда буду переписывать контекст для плагинов.
             */
            mainDir: this.mainDir,

            /**
             * Текущая рабочая директория.
             * @type {string}
             * 
             * NiRBES: Возможно стоит заменить на resolvePath, который будет резолвить пути относительно папки плагина, а не относительно папки запуска,
             * так как это может привести к проблемам при работе с файлами внутри плагина, но пока что оставим так, 
             * так как это может быть полезно для доступа к общим ресурсам и файлам конфигурации, которые находятся в корне проекта.
             * В будущем можно будет добавить оба метода, resolvePath для резолва относительно папки плагина и resolveGlobalPath для 
             * резолва относительно папки запуска, чтобы дать разработчикам плагинов больше гибкости в работе с файлами.
             */
            resolveDir: process.cwd(),

            /**
             * Доступ к терминальному интерфейсу (TerminalInterface).
             * @type {TerminalInterface}
             */
            terminal: this.cli.terminal,

            /**
             * Логгер.
             * @param {...*} args Аргументы для логирования (поддерживаются объекты, ошибки).
             */
            log: logger,

            /**
             * Регистрирует команду CLI, связанную с этим плагином.
             * @param {string|Array<string>} name Имя команды или алиасы (через '|' или массив).
             * @param {string} desc Описание команды.
             * @param {Function} cb Обработчик команды.
             */
            registerCommand: (name, desc, cb) => {
                this.cli.command(name, desc, cb);
                const names = Array.isArray(name) ? name : name.split('|');
                names.forEach(n => pluginInfo.commands.add(n.trim().toLowerCase()));
                this.createContext
            },

            /**
             * Отправляет событие всем плагинам.
             * @param {string} ev Название события.
             * @param {*} [data] Передаваемые данные.
             */
            broadcast: (ev, data) => this.bus.broadcast(pluginInfo.config.name, ev, data),

            /**
             * Отправляет событие конкретному плагину.
             * @param {string} target Имя целевого плагина.
             * @param {string} ev Название события.
             * @param {*} [data] Данные события.
             */
            sendTo: (target, ev, data) => this.bus.sendTo(pluginInfo.config.name, target, ev, data),

            /**
             * Подписывается на личные сообщения от других плагинов.
             * @param {Function} handler Обработчик вида (from, ev, data) => {}
             */
            onMessage: (handler) => this.bus.onMessage(pluginInfo.config.name, handler),

            /**
             * Подписывается на все широковещательные события.
             * @param {Function} handler Обработчик вида (from, ev, data) => {}
             */
            onBroadcast: (handler) => this.bus.onBroadcast(handler),

            /**
             * Отображает многострочный футер в нижней части терминала.
             * @param {Array<string>} lines Строки для отображения.
             */
            renderFooter: (lines) => this.cli.terminal.updateFooter(lines),

            /**
             * Очищает текущий футер.
             */
            clearFooter: () => this.cli.terminal.clearFooterData()
        };
    }

    /**
     * Асинхронно загружает плагин по имени папки.
     * @param {string} folderName Имя директории плагина.
     * @param {boolean} [force=false] Принудительная перезагрузка, даже если уже загружен.
     * @returns {Promise<boolean>} Успешно ли загружен плагин.
     */
    async loadPlugin(folderName, force = false) {
        return this.loader.load(folderName, force);
    }

    /**
     * Асинхронно выгружает плагин по имени.
     * @param {string} name Имя плагина (как указано в его config).
     * @returns {Promise<boolean>} Успешно ли выгружен.
     */
    async unloadPlugin(name) {
        return this.loader.unload(name);
    }

    /**
     * Загружает все плагины из директории `pluginsDir` последовательно.
     * Создаёт директорию, если не существует. Логирует каждый шаг.
     * @returns {Promise<void>}
     */
    async startAll() {
        if (!fs.existsSync(this.pluginsDir)) return;
        const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
        const folders = entries.filter(e => e.isDirectory()).map(e => e.name);
        for (const folder of folders) {
            await this.loadPlugin(folder);
        }
    }

    /**
     * Выводит в лог текущее состояние всех активных плагинов:
     * тип (модуль/процесс), время запуска, количество зарегистрированных команд.
     */
    status() {
        if (this.activePlugins.size === 0) {
            return this.cli.logger.log(chalk.yellow('Нет активных плагинов'));
        }

        const statusObj = {};
        this.activePlugins.forEach((data, name) => {
            statusObj[name] = {
                type: data.config.module ? 'module' : 'process',
                started: data.startTime,
                commands: data.commands.size,
            };
        });

        this.cli.logger.log(chalk.bold.cyan('Активные плагины:'), statusObj);
    }
}
