import readline from 'node:readline';
import stripAnsi from './strip-ansi.js';

/**
 * Класс для работы с интерфейсом терминала, обеспечивающий отрисовку многострочного футера,
 * корректную обработку ANSI-кодов цветов, ограничение ширины строк и отсутствие мерцания при обновлении.
 * Поддерживает интеграцию с `readline` и позволяет выводить логи без нарушения отображения интерфейса.
 */
export default class TerminalInterface {

    /**
     * Экземпляр интерфейса терминала.
     * @param {Object} options - Параметры конфигурации.
     * @param {number} [options.width=process.stdout.columns || 80] - Ширина терминала в символах.
     * @param {Function} [options.completer] - Функция автодополнения для readline.
     */
    constructor(options = {}) {
        this.width = options.width || process.stdout.columns || 80;
        this.isProcessing = false;
        this.footerLines = [];

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            completer: options.completer || null
        });

        this.rl.setPrompt('');

        // Для лимитера строк
        process.stdout.on('resize', () => {
            this.width = process.stdout.columns || 80;
        });
    }

    /**
     * Ограничивает ширину строки с учётом ANSI кодов, не нарушая разметку.
     * Если строка превышает допустимую ширину, она обрезается (text...).
     * @param {string} text - Исходный текст (может содержать ANSI цвета, например, от chalk).
     * @param {number} maxWidth - Максимальная ширина в символах (например, this.width).
     * @returns {string} - Обрезанная строка с сохранением ANSI форматирования и троеточием.
     */
    limitLineWidth(text, maxWidth) {
        const cleanText = stripAnsi(text);
        if (cleanText.length <= maxWidth) return text;
        const allowedWidth = maxWidth - 3;
        if (allowedWidth <= 0) return '...';

        return cleanText.slice(0, allowedWidth) + '...';
    }

    /**
     * Поднимает курсор на количество строк, равное текущему количеству строк футера,
     * чтобы подготовить терминал к его перерисовке. Курсор временно скрывается.
     * Не очищает экран, только перемещает курсор.
     */
    clearFooter() {
        if (this.footerLines.length === 0) return;
        process.stdout.write('\x1B[?25l');
        readline.moveCursor(process.stdout, 0, -this.footerLines.length);
    }

    /**
     * Атомарно отрисовывает футер, используя буферизованный вывод, чтобы избежать мерцания.
     */
    drawFooter() {
        if (this.footerLines.length === 0) {
            process.stdout.write('\x1B[?25h');
            return;
        }

        process.stdout.write('\x1B[?25l');

        let buffer = '';
        this.footerLines.forEach((line) => {
            const safeLine = this.limitLineWidth(line, this.width);
            buffer += '\x1B[K' + safeLine + '\n';
        });
        process.stdout.write(buffer);
        process.stdout.write('\x1B[?25h');
    }

    /**
     * Выводит лог в терминал, временно убирая футер и строку ввода,
     * чтобы не нарушить отображение. После вывода восстанавливает интерфейс.
     * @param {string} formattedText - Текст лога для вывода.
     */
    writeLog(formattedText) {
        this.clearFooter();
        readline.clearScreenDown(process.stdout);
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        console.log(formattedText);

        this.rl._refreshLine();
        this.drawFooter();
    }

    /**
     * Обновляет содержимое футера новым массивом строк и перерисовывает его.
     * @param {string[]} lines - Массив строк для отображения в футере.
     */
    updateFooter(lines) {
        this.clearFooter();
        this.footerLines = lines;
        this.drawFooter();
    }

    /**
     * Полностью очищает футер, удаляет его строки и очищает соответствующую область терминала.
     * Восстанавливает позицию readline.
     */
    clearFooterData() {
        if (this.footerLines.length === 0) return;

        this.clearFooter();
        readline.clearScreenDown(process.stdout);
        this.footerLines = [];
        this.rl._refreshLine();
        process.stdout.write('\x1B[?25h');
    }

    /**
     * Событие ввода строки пользователем.
     * @param {Function} callback - Функция, вызываемая при нажатии Enter.
     */
    onLine(callback) {
        this.rl.on('line', callback);
    }

    /**
     * Событие закрытия интерфейса (например Ctrl+C).
     * @param {Function} callback - Функция, вызываемая при получении SIGINT.
     */
    onClose(callback) {
        this.rl.on('SIGINT', callback);
    }

    /**
     * Активирует prompt readline.
     */
    prompt() {
        this.rl.prompt();
    }

    /**
     * Приостанавливает ввод с помощью readline.
     */
    pause() {
        this.rl.pause();
    }

    /**
     * Возобновляет ввод, если интерфейс ещё не закрыт.
     */
    resume() {
        if (!this.rl.closed) this.rl.resume();
    }

    /**
     * Закрывает интерфейс readline.
     */
    close() {
        this.rl.close();
    }
}
