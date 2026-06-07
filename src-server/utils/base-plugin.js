/**
 * Базовый класс для всех плагинов.
 * 
 * Представляет общую структуру всех плагинов.
 * 
 * Любой пользовательский плагин должен наследоваться от этого класса и переопределять
 * нужные методы.
 * 
 * @example
 * export default class MyPlugin extends BasePlugin {
 *   async onLoad() {
 *     this.context.log('Мой плагин стартует...');
 *     await this.initServices();
 *   }
 * 
 *   async onDisable() {
 *     this.context.log('Останавливаю сервисы...');
 *     await this.shutdown();
 *   }
 * }
 */
export default class BasePlugin {
    /**
     * Экземпляр плагина.
     * 
     * @param {Object} context Контекст, предоставляемый хост-системой.
     * @param {string} context.name Имя плагина.
     * @param {Function} context.log Метод для логирования (опционально).
     * @param {Object} [context.config] Конфигурация плагина.
     * @param {Object} [context.storage] Объект для хранения данных между сессиями.
     * @param {CLI} context.cli Экземпляр CLI для регистрации команд.
     * @param {EventBus} context.bus Шина событий для коммуникации с другими компонентами.
     * 
     * @description
     * Контекст инжектируется при загрузке плагина.
     * Позволяет плагину безопасно взаимодействовать с системой, не имея прямого доступа к её внутренностям.
     */
    constructor(context) {
        this.context = context;
    }

    /**
     * Вызывается в начале загрузки плагина.
     * 
     * Подходит для асинхронной инициализации: подключение к БД, чтение файлов, настройка сервисов.
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * async onLoad() {
     *   this.context.log(`Загружаю кэш для ${this.context.name}...`);
     *   await this.loadCache();
     * }
     * 
     * @virtual
     */
    async onLoad() {
        if (typeof this.context.log === 'function') {
            this.context.log(`Плагин ${this.context.name} запускается...`);
        }
    }

    /**
     * Вызывается после успешной загрузки плагина.
     * 
     * Все зависимости инициализированы, можно отправлять события,
     * регистрировать команды или уведомлять другие модули о готовности.
     * 
     * @returns {Promise<void>}
     * 
     * NiRBES: Принято регать команды в уже загруженном плагине, но я делаю это на этапе загрузки плагина. Данный метод добавил для тру разработчиков.
     * 
     * @example
     * async onLoaded() {
     *   this.context.bus.broadcast('plugin', 'READY', { name: this.context.name });
     *   this.context.log(`✅ ${this.context.name} готов к работе`);
     * }
     * 
     * @virtual
     */
    async onLoaded() {
        if (typeof this.context.log === 'function') {
            this.context.log(`Плагин ${this.context.name} успешно запущен`);
        }
    }

    /**
     * Вызывается при начале отключения плагина.
     * 
     * Используется для graceful shutdown: остановка таймеров, закрытие соединений, сохранение состояния.
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * async onDisable() {
     *   this.context.log(`Останавливаю фоновые задачи...`);
     *   await this.scheduler.stopAll();
     * }
     * 
     * @virtual
     */
    async onDisable() {
        if (typeof this.context.log === 'function') {
            this.context.log(`Плагин ${this.context.name} выключается...`);
        }
    }

    /**
     * Вызывается после полного отключения плагина.
     * 
     * Финальная точка, где можно выполнить чистку или логирование факта завершения.
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * async onDisabled() {
     *   this.context.log(`🔌 Плагин ${this.context.name} отключён`);
     * }
     * 
     * @virtual
     */
    async onDisabled() {
        if (typeof this.context.log === 'function') {
            this.context.log(`Плагин ${this.context.name} выключен`);
        }
    }
}
