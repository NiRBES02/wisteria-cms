import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import BasePlugin from '../../utils/base-plugin.js';
import { execa } from 'execa';

export default class WebpackPlugin extends BasePlugin {
  constructor(context) {
    super(context);
    this.sub = null;
  }

  async onLoad() {
    this.context.log('Plugin status: loading');

    const inputFile = path.join(this.context.dir, 'config.js');
    this.sub = execa('npx', ['webpack', '-c', inputFile, '--watch'], {
      env: { ...process.env, FORCE_COLOR: '1', NODE_ENV: 'development' },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      reject: false,
      cleanup: true,
      detached: false,
    });

    this.sub.stdout.on('data', data => {
      this.context.log(data.toString().trim());
    });

    this.sub.stderr.on('data', data => {
      this.context.log(data.toString().trim());
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
}