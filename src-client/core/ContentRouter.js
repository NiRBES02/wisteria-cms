import Event from '@f/Event';
import ContentManager from './ContentManager.js';

const ContentRouter = {
  click: async (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');

    if (
      link.origin !== window.location.origin ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      href?.startsWith('#') ||
      href?.startsWith('javascript:') ||
      // Фильтр: Роутер игнорирует запросы к API картинок или скинов
      href?.includes('/api/') ||
      href?.includes('/skin/')
    ) return;

    e.preventDefault();
    await ContentManager.load(link.href);
  },

  popstate: async () => {
    const currentHref = window.location.href;
    // Если пользователь нажимает "Назад" на страницу картинки — не обрабатываем через AJAX
    if (currentHref.includes('/api/') || currentHref.includes('/skin/')) return;

    await ContentManager.load(currentHref);
  },

  async init() {
    const currentHref = window.location.href;
    // Если страница изначально загружена по адресу картинки — полностью отключаем AJAX-менеджер
    if (currentHref.includes('/api/') || currentHref.includes('/skin/')) return;

    await ContentManager.load(currentHref);
    document.addEventListener('click', this.click, true);
    window.addEventListener('popstate', this.popstate);
  }
};

Event.on('dom', async () => {
  await ContentRouter.init();
});

export default ContentRouter;