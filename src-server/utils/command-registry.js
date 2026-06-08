/**
 * Реестр команд с поддержкой:
 * - регистрации команд и их алиасов,
 * - поиска по основному имени или синониму,
 * - парсинга аргументов (флаги, значения, позиционные параметры),
 * - удаления команд из реестра.
 * 
 * Используется для реализации CLI интерфейса, консоли администратора или систем плагинов.
 * 
 * @example
 * const registry = new CommandRegistry();
 * 
 * registry.register('help', 'Показать справку', () => { ... });
 * registry.register(['start', 'run', 'go'], 'Запустить сервер', () => { ... });
 * 
 * const cmd = registry.get('run');
 * cmd.callback();
 */
export default class CommandRegistry {
    /**
     * Создаёт новый реестр команд.
     * 
     * @param {Map<string, Object>} [commands] Внутреннее хранилище команд (имя → конфиг).
     * 
     * @description
     * Использует `Map` для эффективного поиска по имени.
     * Поддерживает множественные имена и алиасы через разделитель `|` или массив.
     */
    constructor() {
        this.commands = new Map();
    }

    /**
     * Регистрирует команду с описанием и обработчиком.
     * 
     * Принимает:
     * - строку с разделителем `|` (например, `"help|h|?"`),
     * - массив имён (например, `['start', 'run']`).
     * 
     * Первое имя считается **основным**, остальные — **алиасами**.
     * Все имена регистрируются в нижнем регистре для case-insensitive поиска.
     * 
     * @param {string|string[]} name Основное имя команды или список имён/алиасов.
     * @param {string} description Описание команды (для справки).
     * @param {Function} callback Функция, вызываемая при выполнении команды.
     * @returns {CommandRegistry} Текущий экземпляр (для цепочки вызовов).
     * 
     * @example
     * registry.register('help', 'Вывести помощь', showHelp);
     * registry.register('config|cfg|conf', 'Управление настройками', openConfig);
     * registry.register(['deploy', 'push'], 'Загрузить на сервер', deployApp);
     * 
     * @todo Поддержка валидации аргументов команды при регистрации.
     */
    register(name, description, callback) {
        const names = Array.isArray(name) ? name : name.split('|').map(s => s.trim());
        const mainName = names[0].toLowerCase();
        const aliases = names.slice(1).map(n => n.toLowerCase());

        const config = { mainName, aliases, description, callback };
        names.forEach(n => this.commands.set(n.toLowerCase(), config));
        return this;
    }

    /**
     * Удаляет команду и все её алиасы из реестра.
     * 
     * Поиск осуществляется по любому из имён (основному или алиасу).
     * Если команда найдена — удаляются **все** её имена.
     * 
     * @param {string} commandName Имя команды или алиас для удаления.
     * @returns {void}
     * 
     * @example
     * registry.unregister('debug');
     * registry.unregister('stop'); // удалит и 'halt', если он был алиасом
     * 
     * @todo Вернуть `boolean` — успешность удаления.
     * @todo Поддержка шаблонов (например, `unregisterAll('plugin-*')`).
     */
    unregister(commandName) {
        const config = this.commands.get(commandName.toLowerCase());
        if (!config) return;
        this.commands.delete(config.mainName.toLowerCase());
        config.aliases.forEach(alias => this.commands.delete(alias.toLowerCase()));
    }

    /**
     * Возвращает конфигурацию команды по её имени или алиасу.
     * 
     * Поиск нечувствителен к регистру.
     * 
     * @param {string} commandName Имя команды.
     * @returns {Object|undefined} Объект `{ mainName, aliases, description, callback }` или `undefined`.
     * 
     * @example
     * const cmd = registry.get('HELP');
     * if (cmd) cmd.callback();
     * 
     * @todo Добавить `getAll()` для получения списка всех команд.
     */
    get(commandName) {
        return this.commands.get(commandName.toLowerCase());
    }

    /**
    * Парсит массив аргументов командной строки в структурированный объект.
    * * Функция обрабатывает длинные и короткие флаги, собирает именованные значения
    * (включая повторяющиеся ключи в массивы) и отделяет позиционные аргументы.
    *
    * **Поддерживаемые форматы:**
    * - Длинные флаги (булевы): `--verbose` -> `flags.verbose = true`
    * - Длинные флаги со значением через `=`: `--port=3000` -> `values.port = '3000'`
    * - Длинные флаги со значением через пробел: `--port 3000` -> `values.port = '3000'`
    * - Повторяющиеся флаги: `--file a --file b` -> `values.file = ['a', 'b']`
    * - Одиночные короткие флаги со значением: `-p 3000` -> `values.p = '3000'`
    * - Цепочки коротких флагов: `-abc` -> `flags: { a: true, b: true, c: true }`
    * - Позиционные аргументы: `file.txt` -> `unknown.push('file.txt')`
    *
    * @param {string[]} argsArray - Массив строк аргументов (обычно `process.argv.slice(2)`).
    * @returns {{
    *   flags: Record<string, boolean>,
    *   values: Record<string, string | string[]>,
    *   unknown: string[]
    * }} Объект со следующими свойствами:
    * - `flags`: Сигнальные флаги (со значением `true`).
    * - `values`: Именованные параметры. Строка для одиночного значения или массив строк для дублирующихся ключей.
    * - `unknown`: Список позиционных (оставшихся) аргументов.
    *
    * @example
    * const input = ['--port', '3000', '--file=a.txt', '--file=b.txt', '-vd', 'server.js'];
    * const result = parseArgs(input);
    * // Результат:
    * // {
    * //   flags: { v: true, d: true },
    * //   values: { port: '3000', file: ['a.txt', 'b.txt'] },
    * //   unknown: ['server.js']
    * // }
    */
    parseArgs(argsArray) {
        const parsed = { flags: {}, values: {}, unknown: [] };

        const setValue = (key, value) => {
            if (parsed.values[key] !== undefined) {
                parsed.values[key] = Array.isArray(parsed.values[key]) ? [...parsed.values[key], value] : [parsed.values[key], value];
            } else {
                parsed.values[key] = value;
            }
        };

        for (let i = 0; i < argsArray.length; i++) {
            const arg = argsArray[i];

            if (arg.startsWith('--')) {
                const eqIndex = arg.indexOf('=');

                if (eqIndex !== -1) {
                    const key = arg.slice(2, eqIndex);
                    const value = arg.slice(eqIndex + 1);
                    setValue(key, value);
                } else {
                    const key = arg.slice(2);
                    const nextArg = argsArray[i + 1];

                    if (nextArg !== undefined && !nextArg.startsWith('-')) {
                        setValue(key, nextArg);
                        i++;
                    } else {
                        parsed.flags[key] = true;
                    }
                }
            }
            else if (arg.startsWith('-') && arg !== '-') {
                const chars = arg.slice(1).split('');

                if (chars.length === 1) {
                    const key = chars[0];
                    const nextArg = argsArray[i + 1];

                    if (nextArg !== undefined && !nextArg.startsWith('-')) {
                        setValue(key, nextArg);
                        i++;
                    } else {
                        parsed.flags[key] = true;
                    }
                } else {
                    chars.forEach(f => (parsed.flags[f] = true));
                }
            }
            else {
                parsed.unknown.push(arg);
            }
        }
        return parsed;
    }
}
