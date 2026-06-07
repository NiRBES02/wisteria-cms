const TOKEN_URL = '/index.php?router=socket&model=connect';
const TOKEN_TIMEOUT_MS = 10000;

class SocketAuth {
  /**
   * Проверяет, является ли токен валидным JWT (3 части, разделенные точкой)
   */
  isValid(token) {
    return typeof token === 'string' && token && token.split('.').length === 3 && !/\s/.test(token);
  }

  /**
   * Запрашивает токен у сервера
   */
  async fetchToken() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data?.token && this.isValid(data.token)) return data;
      throw new Error('Некорректный токен');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default new SocketAuth();
