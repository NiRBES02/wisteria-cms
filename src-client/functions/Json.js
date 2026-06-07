const MAX_DEPTH = 5;

/**
 * Превращает значение в строку для отладки (упрощенная версия)
 */
function toDebugString(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;
  if (type === 'number' || type === 'boolean') return value.toString();
  if (type === 'string') return `"${value.replace(/"/g, '\\"')}"`;
  if (type === 'symbol') return value.toString();
  if (type === 'function') return `[Function: ${value.name || 'anonymous'}]`;

  if (value instanceof Date) return `"${value.toISOString()}"`;
  if (value instanceof RegExp) return `[RegExp: ${value.toString()}]`;
  if (value instanceof URL) return `[URL: ${value.href}]`;

  // Обработка DOM элементов
  if (value instanceof HTMLElement) {
    const elementDebug = {
      __type: value.constructor.name,
      tagName: value.tagName.toLowerCase(),
      id: value.id || undefined,
      className: value.className || undefined,
      value: value.value !== undefined && value.tagName !== 'DIV' ? value.value : undefined,
      checked: 'checked' in value ? value.checked : undefined,
      disabled: value.disabled || undefined,
      attributes: value.hasAttributes() ? Array.from(value.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}) : undefined,
      classList: value.classList.length > 0 ? Array.from(value.classList) : undefined,
    };
    return Object.fromEntries(Object.entries(elementDebug).filter(([_, v]) => v !== undefined));
  }

  if (typeof File !== 'undefined' && value instanceof File) return `[File: ${value.name}, ${value.size} bytes]`;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return `[Blob: ${value.size} bytes]`;
  if (value instanceof ArrayBuffer) return `[ArrayBuffer: ${value.byteLength} bytes]`;
  if (ArrayBuffer.isView(value)) return `[${value.constructor.name}(${value.length})]`;

  if (value instanceof Error) {
    return {
      __error_type: value.name || 'Error',
      message: value.message,
      stack: value.stack ? value.stack.split('\n')[1]?.trim() : undefined,
      ...value,
    };
  }

  if (value instanceof Map) {
    const obj = {};
    value.forEach((v, k) => obj[`MapKey(${k})`] = v);
    return obj;
  }
  if (value instanceof Set) return Array.from(value);

  return value;
}

/**
 * Рекурсивный обход объекта для создания отладочной строки
 */
function formatInternal(value, indent, depth, visited) {
  const nextIndent = indent + '  ';
  const target = toDebugString(value);

  if (typeof target !== 'object' || target === null) return String(target);
  if (visited.has(value)) return '[Circular]';
  visited.add(value);

  if (depth >= MAX_DEPTH) {
    visited.delete(value);
    return Array.isArray(target) ? `[Array(${target.length})]` : `[Object (${Object.keys(target).length} keys)]`;
  }

  if (Array.isArray(target)) {
    if (target.length === 0) { visited.delete(value); return '[]'; }
    const content = target.map(item => `\n${nextIndent}${formatInternal(item, nextIndent, depth + 1, visited)}`).join(',');
    visited.delete(value);
    return `[${content}\n${indent}]`;
  }

  const keys = Reflect.ownKeys(target).filter(k => typeof k === 'string');
  let prefix = (value.constructor && value.constructor !== Object && !(value instanceof Error))
    ? `${value.constructor.name} `
    : '';

  if (keys.length === 0) { visited.delete(value); return prefix + '{}'; }

  const content = keys.map(key => {
    const val = target[key];
    const debugValue = formatInternal(val, nextIndent, depth + 1, visited);
    return `\n${nextIndent}"${key}": ${debugValue}`;
  }).join(',');

  visited.delete(value);
  return `${prefix}{${content}\n${indent}}`;
}

/**
 * Безопасное форматирование любого значения в строку для консоли (Debug Stringifier)
 * 
 * @param {any} value Любое значение
 * @returns {string} Форматированная строка
 */
export function safeDebugFormat(value) {
  const visited = new WeakSet();
  return formatInternal(value, '', 0, visited);
}
