import chalk from 'chalk';
import TerminalInterface from './terminal-interface.js';
import Logger from './logger.js';
import CommandRegistry from './command-registry.js';

/**
 * Интерактивная CLI-оболочка с поддержкой:
 * - регистрации команд и алиасов,
 * - автодополнения по нажатию `Tab`,
 * - парсинга аргументов (`--flag`, `--port=3000`, `-abc`),
 * - встроенной команды `help` и `exit`,
 * - цветного вывода через `chalk`,
 * - логирования в консоль и файл.
 * 
 * Используется как основа для REPL-интерфейсов, админ-консолей, серверных утилит.
 * 
 * @example
 * const cli = new CLI();
 * 
 * cli.command('greet', 'Поприветствовать пользователя', ({ flags, unknown }) => {
 *   const name = unknown[0] || 'Аноним';
 *   const loud = flags[''] || flags.l;
 *   const message = `Привет, ${name}`;
 *   console.log(loud ? message.toUpperCase() : message);
 * });
 * 
 * cli.start(); // → запускает интерфейс
 */
export default class CLI {
    /**
     * Экземпляр CLI.
     * 
     * @param {Object} [options] Настройки CLI.
     * @param {number} [options.width=80] Ширина терминала для переноса строк.
     * @param {string} [options.logDir] Путь к папке логов (передаётся в `Logger`).
     * 
     * @description
     * При инициализации:
     * - создаёт реестр команд,
     * - настраивает интерфейс терминала с автодополнением,
     * - подключает логгер,
     * - регистрирует стандартные команды (`help`, `exit`),
     * - устанавливает обработчики ввода.
     */
    constructor(options = {}) {
        this.registry = new CommandRegistry();
        this.terminal = new TerminalInterface({
            width: options.width,
            completer: (line) => {
                const completions = Array.from(this.registry.commands.keys());
                const hits = completions.filter(c => c.startsWith(line.toLowerCase()));
                return [hits.length ? hits : completions, line];
            }
        });
        this.logger = new Logger(this.terminal, options.logDir);

        this._initDefaultCommands();
        this._initListeners();
    }

    /**
     * Регистрирует новую команду в CLI.
     * 
     * Обёртка над `registry.register()`, но возвращает `this` для цепочки вызовов.
     * 
     * @param {string|string[]} name Имя команды или массив имён/алиасов.
     * @param {string} description Описание команды (показывается в `help`).
     * @param {Function} callback Асинхронная или синхронная функция, принимающая `parsedArgs`.
     * @returns {CLI} Текущий экземпляр (для fluent interface) see https://ru.wikipedia.org/wiki/Fluent_interface.
     * 
     * @example
     * cli.command('start', 'Запустить сервер', () => { ... })
     *     .command('stop', 'Остановить сервер', () => { ... });
     * 
     * @see CommandRegistry.register
     */
    command(name, description, callback) {
        this.registry.register(name, description, callback);
        return this;
    }

    /**
     * Регистрирует встроенные команды по умолчанию.
     * 
     * - `help`, `h`, `?` — выводит список всех команд с описаниями и алиасами.
     * - `exit`, `quit` — завершает процесс (`process.exit(0)`).
     * 
     * @private
     * 
     * @todo Добавить `version` команду при наличии `package.json`.
     * @todo Поддержка `clear` для очистки экрана.
     */
    _initDefaultCommands() {
        this.command(['help', 'h', '?'], 'Показать список всех команд.', () => {
            this.logger.log(chalk.bold.blueBright('Доступные команды:'));
            const commands = Array.from(this.registry.commands.entries())
                .filter(([name, cmd]) => name === cmd.mainName)
                .sort(([a], [b]) => a.localeCompare(b));

            commands.forEach(([name, cmd]) => {
                const aliases = cmd.aliases.length ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
                this.logger.log(`${' '.repeat(2)}${chalk.greenBright(name)}${aliases} — ${cmd.description}`);
            });
        });

        this.command(['exit', 'quit', 'stop'], 'Завершить работу приложения.', () => { this.terminal.rl.emit('SIGINT'); });
    }

    /**
     * Настраивает обработку ввода пользователя через `TerminalInterface`.
     * 
     * При получении строки:
     * - разбивает на команду и аргументы,
     * - ищет команду в реестре,
     * - парсит аргументы (`--flag`, `-v`, `--port=3000`),
     * - вызывает обработчик,
     * - ловит ошибки и выводит их цветом,
     * - возвращает приглашение `>`.
     * 
     * @private
     * 
     * @listens TerminalInterface#onLine
     * 
     * @todo Добавить историю команд (вверх/вниз стрелки).
     * @todo Поддержка многострочного ввода (через `\` или открытие кавычек).
     * @todo При вводе команды нужно будет стирать строку ввода и выводить ошибку.
     */
    _initListeners() {
        this.terminal.onLine(async (line) => {
            const input = line.trim();
            if (!input) {
                this.logger.log(chalk.red('Команда не указана'))
                return this.terminal.prompt()
            };

            const [cmdName, ...rawArgs] = input.split(/\s+/);
            const cmdConfig = this.registry.get(cmdName);

            if (cmdConfig) {
                this.terminal.pause();
                try {
                    const parsedArgs = this.registry.parseArgs(rawArgs);
                    await cmdConfig.callback(parsedArgs);
                } catch (err) {
                    this.logger.log(chalk.red.bold(`Ошибка в команде "${cmdName}":`), chalk.red(err.message));
                    if (err.stack) {
                        this.logger.log(chalk.dim(err.stack.split('\n').slice(1).join('\n')));
                    }
                } finally {
                    this.terminal.resume();
                    this.terminal.prompt();
                }
            } else {
                this.logger.log(chalk.red('Неизвестная команда:'), chalk.yellow(cmdName));
                this.terminal.prompt();
            }
        });
    }

    /**
     * Запускает CLI, отображая строки ввода.
     * 
     * @returns {CLI} Текущий экземпляр.
     * 
     * @example
     * cli.start(); // > _ (готов к вводу)
     * 
     * @todo Добавить баннер при старте (если включено).
     * @todo Поддержка `--no-banner`, `--silent`.
     */
    start() {
        // NiRBES: У нас уже есть MOTD в ентри файле, нужно будет подумать куда его лучше воткнуть и как, лучше это сделать, было бы класно вывести его в отдельный и сделать парсер тегов для кастумизации, но пока пусть будет так как есть.
        this.logger.log(chalk.bold.blueBright('Введите "help", чтобы посмотреть команды.'));
        this.terminal.prompt();
        return this;
    }
}
