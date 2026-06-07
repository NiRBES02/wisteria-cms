import { CFG } from '@f/notify/NotifyConfig';

const DURATION_MS = 5000;
const FADE_MS = 300;
const STEP_MS = 50;

export class NotifyToast {
  constructor(el, { displayMessage, conf }) {
    this.el = el;
    this.displayMessage = displayMessage;
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
    const cloneBtn = this.el.querySelector('.fa-clone')?.parentElement;

    // 1. Логика закрытия через Flowbite
    this.dismiss = new Dismiss(this.el, closeBtn, {
      onHide: () => this.destroy()
    });

    // 2. Кнопка копирования
    if (cloneBtn) this._setupCloneButton(cloneBtn);

    // 3. Пауза при клике
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      this.isPaused = !this.isPaused;
      if (!this.isPaused) this.lastTick = Date.now();
      this.el.classList.toggle('ring-4', this.isPaused);
    });

    // 4. Запуск таймера
    this._startTimer(progressEl);

    // 5. Анимация появления
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

  async _setupCloneButton(btn) {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.displayMessage;
        await navigator.clipboard.writeText(tempDiv.innerText || tempDiv.textContent);

        const icon = btn.querySelector('i');
        const oldClass = icon.className;
        icon.className = 'fa-duotone fa-regular fa-clone-plus text-emerald-400 text-xs';
        btn.classList.add('bg-emerald-500/20', 'ring-1', 'ring-emerald-500/50');
        setTimeout(() => {
          icon.className = oldClass;
          btn.classList.remove('bg-emerald-500/20', 'ring-1', 'ring-emerald-500/50');
        }, 2000);
      } catch (err) { console.error('Clipboard error', err); }
    });
  }

  destroy() {
    clearInterval(this.interval);
    this.el.classList.replace('opacity-100', 'opacity-0');
    this.el.classList.add('scale-95', 'blur-md');
    setTimeout(() => this.el.remove(), FADE_MS);
  }
}
