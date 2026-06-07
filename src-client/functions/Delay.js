/**
 * Создает промис, который разрешится через указанное количество миллисекунд.
 * Полезно для создания пауз в async функциях.
 * 
 * @param {number} ms Миллисекунды ожидания
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
