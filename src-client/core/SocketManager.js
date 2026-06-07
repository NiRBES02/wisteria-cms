import Notify from '@f/Notify';
import SocketAuth from './SocketAuth.js';
import SocketClient from './SocketClient.js';

const DEFAULT_MAX_RETRIES = 5;

class SocketManager {
  constructor(config = {}) {
    this.socketUrl = config.socketUrl || 'http://localhost:2222';
    this.maxTokenRetries = config.maxRetries || DEFAULT_MAX_RETRIES;

    this.tokenAttemptCount = 0;
    this.isErrorNotified = false;
    this.jwtToken = null;

    // Promise для отслеживания готовности всего соединения
    this._isReady = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });

    this.initConnectionFlow();
  }

  get isReady() { return this._isReady; }
  get socket() { return SocketClient.socket; }

  async initConnectionFlow() {
    this.tokenAttemptCount++;

    if (this.tokenAttemptCount > this.maxTokenRetries) {
      const errorMsg = 'Сервер недоступен.';
      if (!this.isErrorNotified) {
        Notify(errorMsg, 'error');
        this.isErrorNotified = true;
      }
      this._rejectReady(new Error(errorMsg));
      return;
    }

    try {
      const authData = await SocketAuth.fetchToken();
      this.tokenAttemptCount = 0;
      this.jwtToken = authData.token;

      const socket = SocketClient.connect(this.socketUrl, this.jwtToken, authData.user.login);
      if (socket) this.setupListeners(socket);

    } catch (error) {
      console.error(`SocketAuth Attempt ${this.tokenAttemptCount}:`, error.message);
      const delay = Math.min(2000 << (this.tokenAttemptCount - 1), 30000) + Math.random() * 1000;
      setTimeout(() => this.initConnectionFlow(), delay);
    }
  }

  setupListeners(socket) {
    socket.on('connect', () => {
      this.isErrorNotified = false;
      this._resolveReady(socket);
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') this.refreshToken();
    });

    socket.on('connect_error', (err) => {
      if (!this.isErrorNotified) {
        Notify('Сервер недоступен. Ожидание подключения...', 'warning');
        this.isErrorNotified = true;
      }
      if (err.message === 'Unauthorized' || err.data?.status === 401) {
        this.refreshToken();
      }
    });
  }

  refreshToken() {
    SocketClient.disconnect();
    this.tokenAttemptCount = 0;
    this.initConnectionFlow();
  }

  send(event, data) {
    if (!this.socket?.connected) {
      Notify('Нет связи с сервером', 'error');
      return;
    }
    this.socket.emit(event, data);
  }

  destroy() {
    SocketClient.disconnect();
  }
}

export default new SocketManager();
