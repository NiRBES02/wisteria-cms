/**
 * Простая замена плейсхолдеров в строке по шаблону {key.subkey}
 * 
 * @param {string} template Строка с шаблонами {name}, {user.name}
 * @param {Object} data Объект с данными для замены
 * @returns {string} Обработанная строка
 */
export function placeholder(template, data) {
  if (typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') return template;

  return template.replace(/{(.*?)}/g, (match, key) => {
    const value = key.split('.').reduce((acc, k) => {
      return (acc !== null && acc !== undefined) ? acc[k] : undefined;
    }, data);

    return value === null || value === undefined ? '' : String(value);
  });
}
