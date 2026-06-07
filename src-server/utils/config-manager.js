import fs from 'node:fs';
import path from 'node:path';

/**
 * Менеджер конфигурации, обеспечивающий:
 * - безопасное чтение и запись JSON-файла,
 * - автоматическую инициализацию при отсутствии файла,
 * - глубокое слияние при сохранении (`deep merge`),
 * - реактивное обновление кэша при внешних изменениях (через `fs.watch`),
 * - защиту от частых записей с помощью `debounce`.
 * 
 * Подходит для хранения настроек приложения, плагинов, пользовательских параметров и т.д.
 * 
 * @example
 * const config = new ConfigManager('./config/app.json');
 * 
 * config.save({ port: 3000, debug: true });
 * const current = config.get();
 * 
 * @todo Добавить контекст для логгера, пока что используем обычный console.log только для критических уведомлений.
 */
export class ConfigManager {
  /** @private @type {string} Полный путь к файлу конфигурации */
  #filePath;

  /** @private @type {Object} Кэш текущей конфигурации в памяти */
  #configCache;

  /** @private @type {NodeJS.Timeout|null} Таймер для debounce при чтении файла */
  #debounceTimeout;

  /**
   * Экземпляр менеджера конфигурации.
   * 
   * @param {string} relativeOrAbsolutePath Путь к файлу конфигурации (относительный или абсолютный).
   * 
   * @description
   * При создании:
   * - разрешает путь с помощью `path.resolve`,
   * - создаёт файл и директории, если их нет,
   * - загружает текущие данные в кэш,
   * - запускает наблюдение за файлом для отслеживания изменений извне.
   */
  constructor(relativeOrAbsolutePath) {
    this.#filePath = path.resolve(relativeOrAbsolutePath);
    this.#configCache = {};
    this.#debounceTimeout = null;

    this.#ensureFileExists();
    this.#loadConfig();
    this.#watchFile();
  }

  /**
   * Возвращает **глубокую копию** текущего состояния конфигурации.
   * 
   * Использует `structuredClone` для полной изоляции возвращаемого объекта.
   * Изменения в возвращаемом объекте **не повлияют** на внутренний кэш.
   * 
   * @returns {Object} Текущая конфигурация.
   * 
   * @example
   * const cfg = config.get();
   * cfg.newProp = 'test'; // не повлияет на исходный кэш
   * config.save(cfg);     // нужно явно сохранить
   */
  get() {
    return structuredClone(this.#configCache);
  }

  /**
   * Сохраняет новые данные в конфиг, выполняя **глубокое слияние** с текущими.
   * 
   * - Не перезаписывает весь файл, а мержит только переданные поля.
   * - Поддерживает вложенные объекты рекурсивно.
   * - Автоматически записывает изменения в файл.
   * 
   * @param {Object} newData Объект с данными для добавления или перезаписи.
   * @throws {Error} Если `newData` не является объектом.
   * 
   * @example
   * config.save({ db: { host: 'localhost', port: 5432 } });
   * config.save({ debug: true }); // частичное обновление
   * 
   * @todo Добавить поддержку `save(path, value)` как альтернативу (типа `lodash.set`).
   * @todo Поддержка транзакций или отката изменений.
   * NiRBES: Я чет сперва хотел добавить что-то вроде роллбека как в PDO, но пока остановился на том что есть, надеюсь когда-нибудь вернусь к этому.
   */
  save(newData) {
    if (!this.#isObject(newData)) {
      throw new Error('Данные для сохранения должны быть объектом');
    }

    this.#configCache = this.#deepMerge(this.#configCache, newData);

    this.#writeConfig();
  }

  /**
   * Проверяет, является ли значение обычным объектом (не массивом, не null, не примитивом).
   * 
   * @param {*} item Проверяемое значение.
   * @returns {boolean} `true`, если это объект.
   * 
   * @private
   */
  #isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Рекурсивно объединяет два объекта (target и source) по полям.
   * 
   * - Если поле — объект, производится рекурсивный merge.
   * - Если поле — примитив или массив перезаписывается.
   * - Массивы не мержатся, а заменяются.
   * 
   * @param {Object} target Целевой объект (существующая конфигурация).
   * @param {Object} source Новые данные.
   * @returns {Object} Новый объект с объединёнными данными.
   * 
   * @private
   * 
   * @example
   * #deepMerge({ a: { x: 1 } }, { a: { y: 2 }, b: 3 })
   * // → { a: { x: 1, y: 2 }, b: 3 }
   */
  #deepMerge(target, source) {
    const output = { ...target };

    if (this.#isObject(target) && this.#isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.#isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.#deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  /**
   * Создаёт файл и все родительские директории, если они не существуют.
   * 
   * Если файл уже есть, то ничего не делает.
   * Если директории отсутствуют, то создаёт их с `recursive: true`.
   * 
   * @private
   * @throws {Error} В случае ошибки файловой системы.
   */
  #ensureFileExists() {
    try {
      if (!fs.existsSync(this.#filePath)) {
        const dir = path.dirname(this.#filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.#filePath, JSON.stringify({}, null, 2), 'utf-8');
      }
    } catch (error) {
      console.error(`[ConfigManager] Ошибка инициализации файла: ${error.message}`);
    }
  }

  /**
   * Читает и парсит JSON файл в кэш.
   * 
   * Если файл пуст или повреждён, логирует ошибку и оставляет/сбрасывает кэш.
   * 
   * @private
   * @throws {SyntaxError} При некорректном JSON.
   */
  #loadConfig() {
    try {
      const content = fs.readFileSync(this.#filePath, 'utf-8').trim();
      this.#configCache = content ? JSON.parse(content) : {};
    } catch (error) {
      console.error(`[ConfigManager] Ошибка чтения/парсинга JSON: ${error.message}`);
    }
  }

  /**
   * Синхронно записывает текущий кэш в файл в формате отформатированного JSON.
   * 
   * Используется `JSON.stringify(..., null, 2)` для удобочитаемости.
   * 
   * @private
   * @throws {Error} При ошибках записи в файловую систему.
   */
  #writeConfig() {
    try {
      const content = JSON.stringify(this.#configCache, null, 2);
      fs.writeFileSync(this.#filePath, content, 'utf-8');
    } catch (error) {
      console.error(`[ConfigManager] Ошибка записи в файл: ${error.message}`);
    }
  }

  /**
   * Запускает наблюдение за файлом конфигурации.
   * 
   * При любом изменении (`change`) срабатывает:
   * - debounce в 50 мс (чтобы избежать множественных перечитываний),
   * - автоматическая перезагрузка кэша из файла.
   * 
   * Это позволяет подхватывать изменения, сделанные извне (например, в редакторе).
   * 
   * @private
   * 
   * @todo Добавить опцию отключения автоподгрузки.
   * @todo Поддержка `chokidar` для более надёжного батчинга (в будущем).
   */
  #watchFile() {
    fs.watch(this.#filePath, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(this.#debounceTimeout);
        this.#debounceTimeout = setTimeout(() => {
          this.#loadConfig();
          // NiRBES: Тут я хотел добавить вывод лога о том что файл изменен, но пока не сделал этого, т.к. сюда тоже нужен контекст, так вышло что конфиг менеджер делался одним из первых еще в V3.x и там небыло передачи многоформатного контекста, поэтому вместо логгера я использовал обычный консольный лог только для критических сообщений, в будущих обновления я добавлю логгер сюда.
        }, 50);
      }
    });
  }
}
