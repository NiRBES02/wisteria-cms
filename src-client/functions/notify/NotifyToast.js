import { CFG } from '@f/notify/NotifyConfig';

const DURATION_MS = 5000;
const FADE_MS = 300;
const STEP_MS = 50;

export class NotifyToast {
  constructor(el, { displayMessage, conf }) {
    this.el = el;
    // Защита: принудительно преобразуем в строку, если прилетел undefined или объект
    this.displayMessage = displayMessage || '';
    this.conf = conf;

    this.remaining = DURATION_MS;
    this.lastTick = Date.now();
    this.isPaused = false;
    this.interval = null;
  }

  async init() {
    const { Dismiss } = await import('flowbite');

    const progressEl = this.el.querySelector('[id$="-progress"]');
    const closeBtn = this.el.querySelector('[data-dismiss-target]');

    // 1. Инициализируем стандартный лок закрытия Flowbite Dismiss
    this.dismiss = new Dismiss(this.el, closeBtn, {
      onHide: () => this.destroy()
    });

    // 2. Делегирование событий: вешаем один слушатель на весь тост
    this.el.addEventListener('click', async (e) => {
      // Ищем, был ли клик по кнопке копирования или по элементам внутри неё
      const copyBtn = e.target.closest('.js-clone-btn');

      if (copyBtn) {
        // Если это кнопка копирования — изолируем событие и запускаем копирование
        e.preventDefault();
        e.stopPropagation();
        await this._handleCopy(copyBtn);
        return;
      }

      // Если кликнули по кнопке закрытия — ничего не делаем, пускай Flowbite закрывает тост
      if (e.target.closest('[data-dismiss-target]')) {
        return;
      }

      // Клик в любое другое место тоста — ставим на паузу или снимаем с неё
      this.isPaused = !this.isPaused;
      if (!this.isPaused) this.lastTick = Date.now();

      // Стилизация паузы (vibrant фиолетовое свечение под твой дизайн)
      this.el.classList.toggle('ring-2', this.isPaused);
      this.el.classList.toggle('ring-purple-500/50', this.isPaused);
    });

    // 3. Запуск таймера
    this._startTimer(progressEl);

    // 4. Анимация появления тоста
    requestAnimationFrame(() => {
      this.el.classList.remove('hidden');
      setTimeout(() => {
        this.el.classList.replace('opacity-0', 'opacity-100');
        this.el.classList.remove('scale-95');
      }, 20);
    });
  }

  _startTimer(progressEl) {
    this.interval = setInterval(() => {
      if (this.isPaused) return;

      const now = Date.now();
      this.remaining -= (now - this.lastTick);
      this.lastTick = now;

      if (this.remaining <= 0) {
        this.dismiss.hide();
      } else if (progressEl) {
        progressEl.style.width = `${(this.remaining / DURATION_MS) * 100}%`;
      }
    }, STEP_MS);
  }

  // Тот самый метод копирования с проверкой контекста окружения (localhost/http/https)
  async _handleCopy(btn) {
    try {
      // Очищаем текст сообщения от HTML-тегов, чтобы скопировать чистый текст
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.displayMessage;
      const textToCopy = tempDiv.innerText || tempDiv.textContent || '';

      if (!textToCopy.trim()) {
        console.warn('[Notify] Пустой текст для копирования');
        return;
      }

      // Проверяем, доступен ли современный асинхронный Clipboard API (HTTPS или Localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Фолбек для небезопасного контекста (обычный HTTP / Termux / локальный IP вроде 192.168.x.x)
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        // Полностью скрываем его из видимости пользователя
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!successful) {
          throw new Error('execCommand copy вернул false');
        }
      }

      // Красивый визуальный эффект успешного выполнения операции
      const icon = btn.querySelector('i');
      if (icon) {
        const oldClass = icon.className;

        // Меняем иконку на галочку и подсвечиваем кнопку зеленым
        icon.className = 'fa-duotone fa-regular fa-check text-emerald-400 text-xs';
        btn.classList.add('bg-emerald-500/20', 'text-emerald-400');

        setTimeout(() => {
          // Через 2 секунды возвращаем всё в исходное состояние
          icon.className = oldClass;
          btn.classList.remove('bg-emerald-500/20', 'text-emerald-400');
        }, 2000);
      }
    } catch (err) {
      console.error('[Notify] Ошибка буфера обмена:', err);
    }
  }

  destroy() {
    clearInterval(this.interval);
    this.el.classList.replace('opacity-100', 'opacity-0');
    this.el.classList.add('scale-95', 'blur-md');
    setTimeout(() => this.el.remove(), FADE_MS);
  }
}