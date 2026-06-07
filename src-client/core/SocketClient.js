import Notify from '@f/Notify';

class SocketClient {
  constructor() {
    this.socket = null;
  }

  /**
   * Создает новое соединение
   */
  connect(url, token, userLogin) {
    if (typeof io === 'undefined') {
      Notify('Socket.IO не найден', 'error');
      return null;
    }

    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(url, {
      auth: { token: token },
      query: { name: userLogin },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketClient();
