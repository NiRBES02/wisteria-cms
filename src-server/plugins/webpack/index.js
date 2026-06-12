import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import BasePlugin from '../../utils/base-plugin.js';
import { execa } from 'execa';
import chalk from 'chalk';

export default class WebpackPlugin extends BasePlugin {
  constructor(context) {
    super(context);
    this.sub = null;
  }

  async onLoad() {
    this.context.log('Plugin status: loading');

    const inputFile = path.join(this.context.dir, 'config.js');

    this.sub = execa('npx', ['webpack', '-c', inputFile, '--watch', '--json'], {
      env: { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      reject: false,
      cleanup: true,
      detached: false,
    });

    let jsonBuffer = '';

    this.sub.stdout.on('data', data => {
      const chunk = data.toString();
      jsonBuffer += chunk;

      if (chunk.includes('\n') || chunk.endsWith('}')) {
        try {
          const stats = JSON.parse(jsonBuffer.trim());
          jsonBuffer = '';

          this.renderWebpackStats(stats);
        } catch (e) { }
      }
    });

    this.sub.stderr.on('data', data => {
      const errText = data.toString();
      if (errText.includes('EACCES') || errText.includes('Watchpack Error')) {
        return;
      }
      this.context.log(`Ошибка: ${errText.trim()}`);
    });

    this.sub.catch(err => {
      this.context.log('Ошибка Webpack:', err.message);
    });
  }

  async onLoaded() {
    this.context.log('Plugin status: loaded');
  }

  async onDisable() {
    this.context.log('Plugin status: disabling');

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
    this.context.log('Plugin status: disabled');
  }

  // Хелперы

  renderWebpackStats(stats) {
    if (stats.errors && stats.errors.length > 0) {
      this.context.log(`Ошибка сборки клиента: (${stats.errors.length} ошибок)`);
      stats.errors.forEach(err => {
        this.context.log(`   -> ${err.message || err}`);
      });
      return;
    }

    const time = stats.time ? `${stats.time}ms` : 'unknown';
    const version = stats.version || '5.x';

    this.context.log(chalk.green(`Клиент успешно собран за ${time}`));

    if (stats.entrypoints) {
      this.context.log(`Точки входа и чанки:`);
      Object.keys(stats.entrypoints).forEach(name => {
        const ep = stats.entrypoints[name];
        const chunks = ep.chunks ? ep.chunks.join(', ') : 'none';
        this.context.log(`  - [${chalk.green(name)}] -> Чанки: [${chalk.green(chunks)}]`);
      });
    }

    if (stats.assets && stats.assets.length > 0) {
      this.context.log(`Сгенерированные ассеты:`);
      stats.assets.forEach(asset => {
        const sizeKb = (asset.size / 1024).toFixed(2);

        const status = asset.emitted ? '[emitted]' : '[cached]';

        this.context.log(`  - ${chalk.green(asset.name)} ${chalk.gray(`(${sizeKb} KiB)`)} ${chalk.gray(status)}`);
      });
    }
  }
}