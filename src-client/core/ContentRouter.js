import Event from '@f/Event';
import ContentManager from './ContentManager.js';

const ContentRouter = {
  click: async (e) => {
    const link = e.target.closest('a');
    if (
      !link ||
      link.origin !== window.location.origin ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      link.getAttribute('href')?.startsWith('#') ||
      link.getAttribute('href')?.startsWith('javascript:')
    ) return;

    e.preventDefault();
    await ContentManager.load(link.href);
  },

  popstate: async () => {
    await ContentManager.load(window.location.href);
  },

  async init() {
    await ContentManager.load(window.location.href);
    document.addEventListener('click', this.click, true);
    window.addEventListener('popstate', this.popstate);
  }
};


Event.on('dom', async () => {
  await ContentRouter.init();
});

export default ContentRouter;
