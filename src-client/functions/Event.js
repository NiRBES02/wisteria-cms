/**
 * Software License: MIT License
 * Author: NiRBES <github.com/NiRBES02>
 * Project Homepage: https://github.com/NiRBES02/EventEmitter
 * Copyright (c) 2025 NiRBES
 * Version: 2.0.0
 */

/**
 * EventEmitter — простая система событий для приложения
 * 
 * Позволяет издавать и слушать события по всему приложению.
 * Поддерживает:
 * - Подписку на события с помощью on()
 * - Однократную подписку с помощью once()
 * - Отписку от событий с помощью off() или removeListener()
 * - Отправку событий с помощью emit()
 * - Обработку ошибок при выполнении обработчиков
 * 
 * @class EventEmitter
 * @example
 * // Подписка на событие
 * Event.on('content.loaded', () => {
 *   console.log('Контент загружен!');
 * });
 * 
 * // Однократная подписка
 * Event.once('user.login', (user) => {
 *   console.log(`Пользователь ${user.name} вошел`);
 * });
 * 
 * // Отправка события
 * Event.emit('content.loaded', dataArg1, dataArg2);
 * 
 * // Отписка
 * Event.off('content.loaded', myHandler);
 * 
 * @author NiRBES02 <github.com/NiRBES02>
 * @version 1.0.0
 * @license MIT
 * @description Этот класс реализует базовую систему событий для клиентского приложения Wisteria CMS. Он позволяет различным частям приложения взаимодействовать друг с другом через события, не создавая жестких связей между ними.
 */
class EventEmitter {
  /**
   * Конструктор EventEmitter
   * 
   * Инициализирует Map для хранения слушателей событий
   */
  constructor() {
    /** @type {Map<string, Function[]>} Map для хранения слушателей по типам событий */
    this.listeners = new Map();
  }

  /**
   * Подписывает обработчик на событие
   * 
   * Добавляет обработчик в список слушателей события.
   * Один обработчик может быть добавлен несколько раз.
   * 
   * Поддерживает method chaining для удобства.
   * 
   * @param {string} eventName Название события (e.g., 'content.loaded')
   * @param {Function} listener Функция-обработчик события
   * @returns {EventEmitter} Возвращает this для method chaining
   * @public
   * @example
   * Event
   *   .on('page.loaded', handler1)
   *   .on('page.loaded', handler2)
   *   .on('user.login', handler3);
   */
  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(listener);
    return this;
  }

  /**
   * Подписывает обработчик на событие один раз
   * 
   * После первого вызова события обработчик автоматически отписывается.
   * Внутренне использует обертку (wrapper), которая снимает подписку после вызова.
   * 
   * @param {string} eventName Название события
   * @param {Function} listener Функция-обработчик события
   * @returns {EventEmitter} Возвращает this для method chaining
   * @public
   * @example
   * Event.once('user.firstLogin', (user) => {
   *   console.log(`Welcome, ${user.name}!`);
   * });
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      this.removeListener(eventName, onceWrapper);
      listener.apply(this, args);
    };
    // Сохраняем ссылку на оригинальный слушатель для возможности удаления через off()
    onceWrapper.originalListener = listener;
    this.on(eventName, onceWrapper);
    return this;
  }

  /**
   * Отправляет событие всем подписанным обработчикам
   * 
   * Вызывает всех слушателей события с переданными аргументами.
   * Обработчики вызываются синхронно в порядке подписки.
   * Ошибки в одном обработчике не прерывают выполнение остальных.
   * 
   * @param {string} eventName Название события
   * @param {...any} args Аргументы для передачи обработчикам
   * @returns {boolean} true если было обработчиков, false если события нет
   * @public
   * @example
   * // Без аргументов
   * Event.emit('content.loaded');
   * 
   * // С несколькими аргументами
   * Event.emit('user.login', userData, sessionToken);
   * Event.emit('page.error', 404, 'Not Found', null);
   */
  emit(eventName, ...args) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return false;

    const stack = [...handlers];

    stack.forEach(handler => {
      try {
        handler.apply(this, args);
      } catch (error) {
        console.error(`[EventEmitter] Error in handler for "${eventName}":`, error);
      }
    });

    return true;
  }

  /**
   * Отписывает обработчик от события
   * 
   * Это псевдоним для removeListener() для удобства (как в Node.js EventEmitter)
   * 
   * @param {string} eventName Название события
   * @param {Function} listener Функция-обработчик для удаления
   * @returns {EventEmitter} Возвращает this для method chaining
   * @public
   * @see removeListener
   */
  off(eventName, listener) {
    return this.removeListener(eventName, listener);
  }

  /**
   * Удаляет конкретного обработчика от события
   * 
   * Удаляет первое совпадение обработчика. Если обработчик был добавлен через
   * once(), нужно передать оригинальную функцию, а не wrapper.
   * 
   * Если после удаления слушателей не осталось — удаляет запись события из Map.
   * 
   * @param {string} eventName Название события
   * @param {Function} listener Функция-обработчик для удаления
   * @returns {EventEmitter} Возвращает this для method chaining
   * @public
   * @example
   * const handler = () => console.log('Event!');
   * 
   * Event.on('myEvent', handler);
   * Event.emit('myEvent'); // Выведет "Event!"
   * 
   * Event.removeListener('myEvent', handler);
   * Event.emit('myEvent'); // Ничего не выведет
   */
  removeListener(eventName, listener) {
    const handlers = this.listeners.get(eventName);

    if (!handlers) return this;

    const index = handlers.findIndex(
      h => h === listener || h.originalListener === listener,
    );

    if (index > -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.listeners.delete(eventName);
    }

    return this;
  }

  /**
   * Удаляет всех слушателей события или всех слушателей всех событий
   * 
   * Если eventName передано — удаляет только слушателей этого события.
   * Если eventName не передано — удаляет слушателей всех событий.
   * 
   * @param {string} [eventName] Название события (опционально)
   * @returns {EventEmitter} Возвращает this для method chaining
   * @public
   * @example
   * // Удалить всех слушателей события
   * Event.removeAllListeners('content.loaded');
   * 
   * // Удалить всех слушателей всех событий
   * Event.removeAllListeners();
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * Возвращает количество слушателей события
   * 
   * Полезно для отладки и тестирования.
   * 
   * @param {string} eventName Название события
   * @returns {number} Количество слушателей события
   * @public
   * @example
   * Event.on('test', () => {});
   * Event.on('test', () => {});
   * console.log(Event.listenerCount('test')); // 2
   */
  listenerCount(eventName) {
    const handlers = this.listeners.get(eventName);
    return handlers ? handlers.length : 0;
  }

  /**
   * Возвращает массив всех слушателей события
   * 
   * Возвращает копию массива, чтобы избежать случайных изменений.
   * 
   * @param {string} eventName Название события
   * @returns {Function[]} Массив обработчиков события
   * @public
   * @example
   * Event.on('test', handler1);
   * Event.on('test', handler2);
   * const listeners = Event.listeners('test'); // [handler1, handler2]
   */
  listeners(eventName) {
    const handlers = this.listeners.get(eventName);
    return handlers ? [...handlers] : [];
  }
}

/**
 * Глобальный экземпляр EventEmitter для использования по всему приложению
 * 
 * @type {EventEmitter}
 * @example
 * import Event from '@f/event';
 * 
 * Event.on('myEvent', handler);
 * Event.emit('myEvent', arg1, arg2);
 */
export default new EventEmitter();
