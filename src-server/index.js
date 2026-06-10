import path from 'node:path';
import CLI from './utils/cli.js';
import PluginManager from './utils/plugin-manager.js';
import { RowBuilder } from './utils/row-builder.js';
import chalk from 'chalk';

import stripAnsi from './utils/strip-ansi.js';

const cli = new CLI({
  width: process.stdout.columns || 80,
  logDir: path.join(process.cwd(), 'log', 'server'),
});

const pluginsDirectory = path.join(process.cwd(), 'src-server/plugins');
const mainDirectory = path.join(process.cwd(), 'src-server');
const pluginManager = new PluginManager(cli, pluginsDirectory, mainDirectory);

// TODO: Сделать единую команду plugin <load|unload|restart> [name]

cli.command('plugins|pl', 'Показать статус и список активных плагинов', () => {
  pluginManager.status();
});


cli.command('load', 'Загрузить или перезагрузить плагин по имени папки', async args => {
  const pluginName = args.unknown[0];
  if (!pluginName) {
    cli.logger.log('Укажите имя папки плагина: load <folderName>');
    return;
  }
  try {
    await pluginManager.loadPlugin(pluginName, true);
  } catch (err) {
    cli.logger.log(`Не удалось загрузить плагин ${pluginName}:`, err.message);
  }
},
);

cli.command('unload', 'Выгрузить активный плагин', async args => {
  const pluginName = args.unknown[0];
  if (!pluginName) {
    cli.logger.log('Укажите имя плагина для выгрузки: unload <pluginName>');
    return;
  }
  const success = await pluginManager.unloadPlugin(pluginName);
  if (success) {
    cli.logger.log(`Плагин ${pluginName} успешно выгружен.`);
  } else {
    cli.logger.log(`Плагин ${pluginName} не найден среди активных.`);
  }
});


async function main() {
  const border = { qlt: '╔', qrt: '╗', qbl: '╚', qbr: '╝', h: '═', v: '║' };

  const BOX_LEFT_PAD = 8;
  const BOX_RIGHT_PAD = 8;

  const INLINE_INDENT = 4;
  const KEY_WIDTH = 6;


  // 1. Сборка рамки
  const titleText = `💜 ${chalk.magenta('WISTERIA')} 💜`;
  const titleClean = stripAnsi(titleText);

  const boxInnerWidth = BOX_LEFT_PAD + titleClean.length + BOX_RIGHT_PAD;

  const topBorder = `${border.qlt}${border.h.repeat(boxInnerWidth)}${border.qrt}`;
  const middleLine = `${chalk.gray(border.v)}${' '.repeat(BOX_LEFT_PAD)}${titleText}${' '.repeat(BOX_RIGHT_PAD)}${chalk.gray(border.v)}`;
  const bottomBorder = `${border.qbl}${border.h.repeat(boxInnerWidth)}${border.qbr}`;

  const leftMargin = ' ';
  const borderColor = chalk.zinc450?.(topBorder) ? chalk.zinc450 : chalk.gray;

  cli.logger.log(leftMargin + borderColor(topBorder));
  cli.logger.log(leftMargin + middleLine);
  cli.logger.log(leftMargin + borderColor(bottomBorder));

  // 2. Сборка блока
  const baseIndent = ' '.repeat(INLINE_INDENT);

  const logRow = (rawKeyText, value) => {
    const paddedKey = rawKeyText.padEnd(KEY_WIDTH, ' ');
    const formattedKey = chalk.bold(paddedKey);
    cli.logger.log(`${baseIndent}${formattedKey}  ::  ${value}`);
  };

  logRow('Проект', chalk.bold.blue('https://wisteriamc.ru'));
  logRow('Версия', chalk.bold.magenta('v4.1.0') + chalk.gray(' experimental'));
  const commentIndentVersion = ' '.repeat(INLINE_INDENT + KEY_WIDTH + 6);
  cli.logger.log(`${commentIndentVersion}${chalk.yellow('Экспериментальная версия для тестирования новых возможностей')}`);
  cli.logger.log(`${commentIndentVersion}${chalk.gray('(Продакшен? Вернитесь к v3.x)')}`);


  await pluginManager.startAll();

  cli.start();
}

cli.terminal.onClose(async () => {
  cli.logger.log('Выключение системы, отгрузка плагинов...');
  for (const pluginName of pluginManager.activePlugins.keys()) {
    await pluginManager.unloadPlugin(pluginName);
  }
  process.exit(0);
});

main().catch(err => {
  cli.logger.log('Критическая ошибка при запуске:', err);
  process.exit(1);
});


// NiRBES: Тестировал RowBuilder и футер рендер, решил оставить :)
cli.command('test', 'Запустить стресс-тест трехстрочного мультилайна и логирования', async () => {
  cli.terminal.pause();

  cli.logger.log(chalk.bold.magenta('\n=== СТАРТ ТЕСТА МУЛЬТИЛАЙНА (ИНТЕРФЕЙС КОЛОНОК) ==='));
  cli.logger.log('Инициализация...');

  const totalSteps = 100;
  const systemLogs = [
    '[Core] Проверка контрольных сумм модулей WisteriaMC...',
    '[Database] Пул соединений удерживает 4 активные сессии',
    '[Network] Получен пинг от удаленного узла Wisteria (12ms)',
    '[Security] Токен авторизации Discord API проверен успешно',
    '[Watcher] Обнаружено изменение в структуре конфигурации'
  ];

  const filesToArchive = [
    'index.php', 'WisteriaMC.js', 'styles.css', 'config.json', 'main.java',
    'init.sql', 'bot.js', 'package.json', 'readme.md', 'avatar.png',
    'server.properties', 'plugin.yml', 'wisteria.blade.php', 'api.js', 'utils.js'
  ];

  const builder = new RowBuilder({
    screenWidth: () => cli.terminal.width || 80,
    columns: [
      { width: 18, align: 'left', color: chalk.white }, // Левая колонка
      { align: 'left', color: chalk.white },            // Центр
      { width: 10, align: 'right', color: chalk.gray }  // Правая колонка
    ]
  });

  for (let current = 0; current <= totalSteps; current += 2) {
    const percent = current / totalSteps;
    const screenWidth = cli.terminal.width || 80;

    // Первая строка: прогресс бар
    // 18 (col1) + 10 (col3) + 2 (разделители) + 2 (скобки бара) = 32
    const pfgWidth = Math.max(0, screenWidth - 32);
    const filledWidth = Math.round(pfgWidth * percent);
    const emptyWidth = Math.max(0, pfgWidth - filledWidth);

    const coloredBar = chalk.gray('[') + chalk.magenta('▰').repeat(filledWidth) + chalk.gray('▱').repeat(emptyWidth) + chalk.gray(']');

    builder.columns[0].color = chalk.blueBright;
    builder.columns[1].color = (text) => text;
    builder.columns[2].color = chalk.magentaBright;
    const line1 = builder.build('Загрузка модулей:', coloredBar, `${current}%`);


    // Вторая строка: текущая задача
    builder.columns[0].color = chalk.blueBright;
    builder.columns[2].color = chalk.bold.cyan;
    const line2 = builder.build(
      'Текущая задача:',
      'Резервное копирование исходного кода проекта...',
      'Wisteria'
    );


    // Третья строка: статус системы
    const memoryStr = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`;
    builder.columns[0].color = chalk.blueBright;
    builder.columns[2].color = chalk.yellowBright;
    const line3 = builder.build(
      'Статус системы:',
      `Выполнено на ${current}%`,
      memoryStr
    );


    // Четвертая строка: живая лента файлов (Изначально готовилась для бекап архиватора)
    const fileIndex = Math.floor(percent * (filesToArchive.length - 1));
    const currentFile = filesToArchive[fileIndex];
    const fileSize = `${(Math.random() * 40 + 5).toFixed(1)} KB`;

    builder.columns[0].color = chalk.blueBright;
    builder.columns[1].color = chalk.gray;
    builder.columns[2].color = chalk.yellowBright;
    const line4 = builder.build(
      'Обработка файла:',
      currentFile,
      fileSize
    );

    if (current > 0 && current % 20 === 0) {
      const randomLog = systemLogs[(current / 20) - 1] || systemLogs[0];
      cli.logger.log(randomLog);
    }

    cli.terminal.updateFooter([line1, line2, line3, line4]);

    await new Promise(resolve => setTimeout(resolve, 80));
  }

  cli.terminal.clearFooterData();

  cli.logger.log(chalk.bold.green('=== ТЕСТ УСПЕШНО ЗАВЕРШЕН ==='));
  cli.logger.log('Все строки колонок удалены, интерфейс возвращен в стандартному состоянию.');

  cli.terminal.resume();
  cli.terminal.prompt();
});
