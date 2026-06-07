import { EventEmitter } from 'node:events';

/**
 * Централизованная шина событий (Event Bus) для коммуникации между плагинами.
 * 
 * Позволяет:
 * - рассылать сообщения всем плагинам (`broadcast`),
 * - отправлять сообщения конкретному плагину (`sendTo`),
 * - подписываться на входящие сообщения (`onMessage`, `onBroadcast`).
 * 
 * Основана на Node.js `EventEmitter`, но абстрагирует логику маршрутизации,
 * обеспечивая удобный и чистый интерфейс для внутреннего обмена данными.
 * 
 * @example
 * const bus = new EventBus();
 * 
 * // Получаем сообщения, предназначенные нам
 * bus.onMessage('plugin-a', ({ from, event, payload }) => {
 *   console.log(`От ${from} событие ${event}:`, payload);
 * });
 * 
 * // Отправляем сообщение конкретному получателю
 * bus.sendTo('core', 'plugin-a', 'READY', { version: '1.0' });
 * 
 * // Рассылаем событие всем слушателям
 * bus.broadcast('core', 'SERVER_STARTED', { port: 3000 });
 */
export default class EventBus {
    /**
     * Создаёт новую шину событий с увеличенным лимитом слушателей.
     * 
     * @param {number} [maxListeners=200] Максимальное количество слушателей на один тип события.
     * 
     * @description
     * Увеличение лимита предотвращает предупреждения `MaxListenersExceededWarning`
     * при работе с большим количеством динамически подключаемых плагинов или модулей.
     */
    constructor(maxListeners = 200) {
        this.bus = new EventEmitter();
        this.bus.setMaxListeners(maxListeners);
    }

    /**
     * Отправляет сообщение всем плагинам.
     * 
     * Событие `broadcast` будет получено всеми, кто использует `onBroadcast()`.
     * Полезно для уведомлений, которые должны достичь всех плагинов (например, старт сервера).
     * 
     * @param {string} from Идентификатор отправителя (например, имя модуля или плагина).
     * @param {string} event Название события (например, `SERVER_START`, `CONFIG_UPDATED`).
     * @param {*} [payload] Произвольные данные, сопровождающие событие (объект, строка, число и т.д.).
     * 
     * @emits EventBus#broadcast
     * 
     * @example
     * bus.broadcast('database', 'CONNECTED', { attempts: 1 });
     * 
     * @todo Добавить опциональную фильтрацию по типу события.
     * @todo Поддержка асинхронных обработчиков с `Promise.all`.
     */
    broadcast(from, event, payload) {
        this.bus.emit('broadcast', { from, event, payload });
    }

    /**
     * Отправляет сообщение конкретному плагину по имени.
     * 
     * Событие маршрутизируется на канал `message:<target>`, и его может получить только
     * тот, кто подписался через `onMessage(target, ...)`.
     * 
     * @param {string} from Идентификатор отправителя.
     * @param {string} target Имя плагина (регистронезависимо).
     * @param {string} event Название события.
     * @param {*} [payload] Данные события.
     * 
     * @emits EventBus#message
     * 
     * @example
     * bus.sendTo('auth', 'email-service', 'SEND_EMAIL', { to: 'user@example.com' });
     * 
     * @todo Добавить проверку существования получателя.
     * @todo Поддержка групповой рассылки (например, `sendTo(['a', 'b'], ...)`).
     */
    sendTo(from, target, event, payload) {
        const destination = target?.toLowerCase();
        if (!destination) return;
        this.bus.emit(`message:${destination}`, { from, event, payload });
    }

    /**
     * Подписывается на входящие сообщения от других плагинов.
     * 
     * Вызывается каждый раз, когда кто-то отправляет сообщение с помощью `sendTo()`
     * и указывает текущий `target` в качестве получателя.
     * 
     * @param {string} target - Имя получателя (должно совпадать с именем в `sendTo`).
     * @param {Function} handler - Функция-обработчик, принимающая объект `{ from, event, payload }`.
     * 
     * @example
     * bus.onMessage('logger', ({ from, event, payload }) => {
     *   console.log(`[${from}] ${event}:`, payload);
     * });
     * 
     * @todo Добавить возможность отписки.
     * @todo Поддержка wildcard подписок (`message:*`). Сотрите в интернете что такое wildcard события.
     */
    onMessage(target, handler) {
        this.bus.on(`message:${target.toLowerCase()}`, handler);
    }

    /**
     * Подписывается на все сообщения.
     * 
     * Полезно для системных компонентов, которые должны реагировать на глобальные события.
     * 
     * @param {Function} handler Обработчик, вызываемый при любом `broadcast`.
     * 
     * @example
     * bus.onBroadcast(({ from, event, payload }) => {
     *   stats.logEvent(event, from);
     * });
     * 
     * @todo Добавить фильтрацию событий внутри метода (`event`).
     * @todo Логирование всех broadcast-событий.
     */
    onBroadcast(handler) {
        this.bus.on('broadcast', handler);
    }
}
