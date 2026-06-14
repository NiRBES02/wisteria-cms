import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import BasePlugin from '../../utils/base-plugin.js';
import { ConfigManager } from '../../utils/config-manager.js';
import { execa } from 'execa';
import chalk from 'chalk';

import { stripAnsiTemplate } from '../../utils/strip-ansi.js';

export default class TailwindCssPlugin extends BasePlugin {
  constructor(context) {
    super(context);
    this.sub = null;
  }

  async onLoad() {
    this.context.log('Статус: инициализация');

    const inputFile = path.join(this.context.dir, 'tailwind.css');
    const outputFile = path.join(process.cwd(), 'public', 'assets', 'css', 'tailwind.css');

    this.sub = execa('npx', ['@tailwindcss/cli', '-i', inputFile, '-o', outputFile, '--watch'], {
      env: { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      reject: false,
      cleanup: true,
      detached: false,
    });

    this.sub.stdout.on('data', data => {
      const output = data.toString().trim();
      if (output) this.context.log(output);
    });

    this.sub.stderr.on('data', async data => {
      const rawOutput = data.toString();
      const output = rawOutput.replace(stripAnsiTemplate, '').trim();

      if (!output) return;

      if (output.includes('Done')) {
        const timeMatch = output.match(/(\d+(?:\.\d+)?(?:ms|s))/);
        const timeTaken = timeMatch ? timeMatch[1] : 'unknown';

        await this.renderTailwindStats(outputFile, timeTaken);
      } else if (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed')) {
        this.context.log(`Ошибка сборки CSS:\n${rawOutput.trim()}`);
      } else {
        if (output.includes('Watching')) return;
        this.context.log(rawOutput.trim());
      }
    });

    this.sub.catch(err => {
      this.context.log('Ошибка Tailwindcss:', err.message);
    });
  }

  async onLoaded() {
    this.context.log('Статус: инициализирован');
  }

  async onDisable() {
    this.context.log('Статус: отключение');

    if (!this.sub) return;

    try {
      if (process.platform === 'win32') {
        await execa('taskkill', ['/pid', this.sub.pid, '/f', '/t']);
      } else {
        process.kill(-this.sub.pid, 'SIGKILL');
      }

      await this.sub;
    } catch (err) {
      this.context.log('Ошибка остановки процесса:', err.message);
    } finally {
      this.sub = null;
    }
  }

  async onDisabled() {
    this.context.log('Статус: отключен');
  }

  // Хелперы

  async renderTailwindStats(outputFile, timeTaken) {
    this.context.log(chalk.green(`CSS успешно собран за ${timeTaken}`));

    try {
      const stats = await fs.stat(outputFile);
      const sizeKb = (stats.size / 1024).toFixed(2);

      const relativePath = path.relative(process.cwd(), outputFile).replace(/\\/g, '/');

      this.context.log(`Сгенерированные ассеты:`);
      this.context.log(`  - ${chalk.green(relativePath)} ${chalk.gray(`(${sizeKb} KiB)`)} ${chalk.gray('[emitted]')}`);
    } catch (e) {
      const shortName = path.basename(outputFile);
      this.context.log(`Сгенерированные ассеты:`);
      this.context.log(`  - ${chalk.green(`public/assets/css/${shortName}`)} ${chalk.gray('(unknown size)')} ${chalk.gray('[emitted]')}`);
    }
  }
}