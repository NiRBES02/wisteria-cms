import chalk from 'chalk';
import { stripAnsi } from './strip-ansi.js';

/**
 * Класс для построения форматированных строк в терминале с поддержкой колонок,
 * ANSI-цветов, динамических и фиксированных ширин, выравнивания и обрезки текста.
 * Учитывает реальную визуальную длину строк (игнорируя ANSI-коды при расчётах),
 * чтобы избежать нарушения табличной структуры.
 */
export class RowBuilder {

    /**
     * Экземпляр RowBuilder.
     * @param {Object} options - Параметры конфигурации.
     * @param {number|Function} [options.screenWidth=80] - Ширина экрана в символах. Может быть функцией для динамического получения.
     * @param {Array<Object>} [options.columns=[]] - Массив конфигураций колонок.
     * @param {number} [options.columns.width] - Фиксированная ширина колонки. Если не задана — ширина распределяется динамически.
     * @param {'left'|'right'} [options.columns.align='left'] - Выравнивание содержимого колонки.
     * @param {Function} [options.columns.color=(txt) => txt] - Функция для раскраски содержимого (например, chalk.green).
     */
    constructor({ screenWidth = 80, columns = [] }) {
        this.getScreenWidth = typeof screenWidth === 'function' ? screenWidth : () => screenWidth;
        this.columns = columns;
    }

    /**
     * Формирует строку из переданных значений согласно конфигурации колонок.
     * Учитывает ANSI коды, обрезает переполняющий текст, добавляет троеточие,
     * распределяет ширину между динамическими колонками и применяет выравнивание.
     * @param {...*} values - Значения для каждой колонки (будут приведены к строке).
     * @returns {string} - Отформатированная строка, готовая к выводу в терминал.
     */
    build(...values) {
        const totalWidth = this.getScreenWidth();
        const numCols = this.columns.length;

        let fixedWidthSum = 0;
        let dynamicCount = 0;

        this.columns.forEach((col) => {
            if (col.width) fixedWidthSum += col.width;
            else dynamicCount++;
        });

        const separatorsWidth = numCols - 1;
        const availableForDynamic = totalWidth - fixedWidthSum - separatorsWidth;
        const dynamicWidth = dynamicCount > 0 ? Math.max(0, Math.floor(availableForDynamic / dynamicCount)) : 0;

        const formattedSegments = this.columns.map((col, index) => {
            const rawValue = String(values[index] ?? '');

            const cleanText = stripAnsi(rawValue);
            const cleanLength = cleanText.length;

            const targetWidth = col.width || dynamicWidth;
            const align = col.align || 'left';
            const colorFn = col.color || ((txt) => txt);

            let visibleText = rawValue;
            let currentCleanLength = cleanLength;

            if (cleanLength > targetWidth) {
                if (rawValue.length !== cleanLength) {
                    visibleText = targetWidth > 3
                        ? cleanText.slice(0, targetWidth - 3) + '...'
                        : cleanText.slice(0, targetWidth);
                } else {
                    visibleText = targetWidth > 3
                        ? rawValue.slice(0, targetWidth - 3) + '...'
                        : rawValue.slice(0, targetWidth);
                }
                currentCleanLength = stripAnsi(visibleText).length;
            }

            const textIsColored = rawValue.length !== cleanLength;
            const coloredText = textIsColored ? visibleText : colorFn(visibleText);

            const paddingLength = Math.max(0, targetWidth - currentCleanLength);
            const padding = ' '.repeat(paddingLength);

            if (align === 'right') {
                return padding + coloredText;
            } else {
                return coloredText + padding;
            }
        });

        return formattedSegments.join(' ');
    }
}
