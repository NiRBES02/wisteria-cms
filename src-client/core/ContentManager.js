import Event from '@f/Event';
import Notify from '@f/Notify';
import ScriptLoader from './ScriptLoader.js';

class ContentManager {
  constructor() {
    this.currentLayoutName = null;
    this.currentLayoutTemplate = null;
    this.currentNavbar = {};
    this.currentContent = {};
    this.currentFooter = {};
    this.currentNavbarHash = null;
    this.currentContentHash = null;
    this.currentFooterHash = null;
    this.currentUrl = null;
  }

  async load(url) {
    if (!url) return;
    const urlObj = new URL(url, window.location.origin).href;
    await this.fetch(urlObj);
  }

  async fetch(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      const targetUrl = new URL('/index.php', window.location.origin);
      urlObj.searchParams.forEach((val, key) => targetUrl.searchParams.append(key, val));

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!res.ok) throw new Error(`Response status: ${res.status}`);
      const json = await res.json();
      console.log(json)

      if (this._shouldRedirectOnNotify(json, urlObj)) {
        await this.load('/');
        return;
      }

      if (json.data?.notify) {
        const { message, type } = json.data.notify;
        await Notify(message, type);
      }

      await this.fullUpdate(json, urlObj);
    } catch (e) {
      console.error('[ContentManager] Fetch error:', e);
    }
  }

  _shouldRedirectOnNotify(json, urlObj) {
    return (json?.data?.notify && !json?.layout?.content && window.location.href === urlObj.href);
  }

  async fullUpdate(data, url) {
    let updateResult = { navbarChanged: false, contentChanged: false, footerChanged: false };

    if (data.layout) {
      updateResult = await this._updateDOM(data.layout, url);
    } else {
      updateResult = await this._partialUpdate(data);
    }

    if (data.layout) {
      await this._handleScripts(data.layout, updateResult);
    }

    Event.emit('content.loaded');
  }

  /**
   * Логика определения того, какие скрипты грузить
   */
  async _handleScripts(layout, result) {
    const scriptTypes = ['content', 'navbar', 'footer'];

    for (const type of scriptTypes) {
      // Выбираем кастомный скрипт или fallback (Default)
      let scripts = layout[`${type}Scripts`] || layout[`${type}ScriptsDefault`];

      if (scripts && Array.isArray(scripts) && scripts.length > 0 && result[`${type}Changed`]) {
        if (ScriptLoader.shouldLoad(scripts, type, this.currentUrl)) {
          await ScriptLoader.load(scripts, type);
        }
      }
    }
  }

  async _updateDOM(layoutData, url) {
    Event.emit('content.unloaded');
    if (url) {
      history.pushState(null, '', url.href);
      this.currentUrl = url.href;
    }

    if (this.currentLayoutName !== layoutData.layoutName) {
      document.body.innerHTML = layoutData.layoutTemplate;
      this.currentLayoutName = layoutData.layoutName;
      this.currentLayoutTemplate = layoutData.layoutTemplate;
      this.currentNavbar = {}; this.currentContent = {}; this.currentFooter = {};
      this.currentNavbarHash = null; this.currentContentHash = null; this.currentFooterHash = null;
    }

    return await this._partialUpdate(layoutData);
  }

  // ... (Методы _calculateHash, _partialUpdate, _updateElementById, _clearNavbar, _clearFooter, _isValidElementId остаются такими же)
  // Копируй их из своего оригинала сюда без изменений


  /**
       * Проверяет, является ли строка валидным ID для элемента DOM
       * 
       * Пропускает числовые ключи (индексы массивов) и пустые строки
       * 
       * @param {string} key Ключ из данных
       * @returns {boolean} true если это валидный ID для элемента
       * @private
       */
  _isValidElementId(key) {
    return key && !/^\d+$/.test(key);
  }

  /**
     * Очищает navbar из DOM и состояния
     * 
     * @private
     */
  _clearNavbar() {
    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
      navbarElement.innerHTML = '';
    }
    this.currentNavbar = {};
    this.currentNavbarHash = null;
  }

  /**
   * Очищает footer из DOM и состояния
   * 
   * @private
   */
  _clearFooter() {
    const footerElement = document.getElementById('footer');
    if (footerElement) {
      footerElement.innerHTML = '';
    }
    this.currentFooter = {};
    this.currentFooterHash = null;
  }

  /**
     * Обновляет содержимое элемента в DOM
     * 
     * Процесс:
     * 1. Пропускает если содержимое не изменилось
     * 2. Находит элемент по ID
     * 3. Сохраняет классы элемента
     * 4. Обновляет innerHTML
     * 5. Восстанавливает классы
     * 6. Обновляет кэш состояния
     * 
     * @param {string} elementId ID элемента в DOM
     * @param {string} newContent Новое HTML содержимое
     * @param {Object} currentState Объект для хранения текущего состояния
     * @returns {Promise<void>}
     * @private
     */
  async _updateElementById(elementId, newContent, currentState) {
    // Пропускаем если содержимое не изменилось
    if (currentState[elementId] === newContent) {
      return;
    }

    const element = document.getElementById(elementId);
    if (element) {
      // Сохраняем классы, чтобы не потерять стили
      const currentClasses = element.className;

      // Обновляем содержимое
      element.innerHTML = newContent;

      // Восстанавливаем классы
      element.className = currentClasses;

      // Обновляем состояние
      currentState[elementId] = newContent;

      console.log(
        `%c[ContentManager] %cЭлемент обновлен: %c${elementId}`,
        'color: green; font-weight: bold;',
        'color: sky;',
        'color: orange; font-style: italic;',
      );
    } else {
      console.warn(`[ContentManager] Element #${elementId} not found in DOM`);
      console.warn(
        `%c[ContentManager] %cЭлемент не найден в DOM: %c#${elementId}`,
        'color: green; font-weight: bold;',
        'color: red;',
        'color: orange; font-style: italic;',
      );
    }
  }


  /**
       * Частичное обновление компонентов макета
       * 
       * Используется когда layout не изменился, но могут измениться:
       * - navbar (с fallback на navbarDefault)
       * - content
       * - footer (с fallback на footerDefault)
       * 
       * Для каждого компонента:
       * 1. Вычисляет хеш для детектирования изменений
       * 2. Если хеш изменился — обновляет элементы в DOM
       * 3. Возвращает информацию о том, какие компоненты изменились
       * 
       * @param {Object} layoutData Данные layout
       * @returns {Promise<Object>} {navbarChanged, contentChanged, footerChanged}
       * @private
       */
  async _partialUpdate(layoutData) {
    let navbarChanged = false;
    let contentChanged = false;
    let footerChanged = false;

    // === Обновление Navbar ===
    let navbarData = layoutData.navbar;

    // Используем стандартный navbar если кастомный не задан
    if (navbarData === null && layoutData.navbarDefault) {
      console.log(
        `%c[ContentManager] %cИспользуем navbarDefault %c(fallback)`,
        'color: green; font-weight: bold;',
        'color: orange;',
        'color: gray; font-style: italic;',
      );
      navbarData = layoutData.navbarDefault;
    }

    if (navbarData && typeof navbarData === 'object') {
      const newNavbarHash = this._calculateNavbarHash(navbarData);

      // Обновляем только если хеш изменился
      if (this.currentNavbarHash !== newNavbarHash) {
        navbarChanged = true;
        this.currentNavbarHash = newNavbarHash;

        // Обновляем каждый элемент navbar
        for (const [key, content] of Object.entries(navbarData)) {
          if (this._isValidElementId(key) && typeof content === 'string') {
            await this._updateElementById(key, content, this.currentNavbar);
          }
        }
      }
    } else if (navbarData === null) {
      console.log(
        `%c[ContentManager] %cNavbar null %c(clear)`,
        'color: green; font-weight: bold;',
        'color: orange;',
        'color: gray; font-style: italic;',
      );
      this._clearNavbar();
    }

    // === Обновление Content ===
    if (layoutData.content && typeof layoutData.content === 'object') {
      const newContentHash = this._calculateContentHash(layoutData.content);

      if (this.currentContentHash !== newContentHash) {
        contentChanged = true;
        this.currentContentHash = newContentHash;

        for (const [key, content] of Object.entries(layoutData.content)) {
          if (this._isValidElementId(key) && typeof content === 'string') {
            await this._updateElementById(key, content, this.currentContent);
          }
        }
      }
    }

    // === Обновление Footer ===
    let footerData = layoutData.footer;

    // Используем стандартный footer если кастомный не задан
    if (footerData === null && layoutData.footerDefault) {
      console.log(
        `%c[ContentManager] %cИспользуем footerDefault %c(fallback)`,
        'color: green; font-weight: bold;',
        'color: orange;',
        'color: gray; font-style: italic;',
      );
      footerData = layoutData.footerDefault;
    }

    if (footerData && typeof footerData === 'object') {
      const newFooterHash = this._calculateFooterHash(footerData);

      if (this.currentFooterHash !== newFooterHash) {
        footerChanged = true;
        this.currentFooterHash = newFooterHash;

        for (const [key, content] of Object.entries(footerData)) {
          if (this._isValidElementId(key) && typeof content === 'string') {
            await this._updateElementById(key, content, this.currentFooter);
          }
        }
      }
    } else if (footerData === null) {
      console.log(
        `%c[ContentManager] %cFooter null %c(clear)`,
        'color: green; font-weight: bold;',
        'color: orange;',
        'color: gray; font-style: italic;',
      );
      this._clearFooter();
    }

    return { navbarChanged, contentChanged, footerChanged };
  }

  /**
     * Вычисляет хеш-сумму для navbar
     * 
     * Используется для детектирования изменений содержимого без сравнения строк
     * 
     * @param {Object} navbarData Объект navbar {elementId: htmlContent}
     * @returns {string} Закодированная хеш-сумма
     * @private
     */
  _calculateNavbarHash(navbarData) {
    const navbarString = Object.entries(navbarData)
      .filter(([key]) => this._isValidElementId(key))
      .map(([key, content]) => `${key}:${content}`)
      .join('|');
    return encodeURIComponent(navbarString);
  }

  /**
   * Вычисляет хеш-сумму для контента
   * 
   * @param {Object} contentData Объект контента {elementId: htmlContent}
   * @returns {string} Закодированная хеш-сумма
   * @private
   */
  _calculateContentHash(contentData) {
    const contentString = Object.entries(contentData)
      .filter(([key]) => this._isValidElementId(key))
      .map(([key, content]) => `${key}:${content}`)
      .join('|');
    return encodeURIComponent(contentString);
  }

  /**
   * Вычисляет хеш-сумму для footer
   * 
   * @param {Object} footerData Объект footer {elementId: htmlContent}
   * @returns {string} Закодированная хеш-сумма
   * @private
   */
  _calculateFooterHash(footerData) {
    const footerString = Object.entries(footerData)
      .filter(([key]) => this._isValidElementId(key))
      .map(([key, content]) => `${key}:${content}`)
      .join('|');
    return encodeURIComponent(footerString);
  }

}

export default new ContentManager();
