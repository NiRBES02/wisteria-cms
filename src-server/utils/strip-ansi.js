/**
 * Удаляет ANSI коды из строки.
 * @param {string} str - Строка с ANSI кодами.
 * @returns {string} - Строка без ANSI кодов.
 */
export default function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}