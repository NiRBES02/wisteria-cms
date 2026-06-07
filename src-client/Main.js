import Client from './core/Client.js';
import Event from '@f/Event';

const init = () => {
  console.log('[Main] Инициализация приложения...');
  Client.event.emit('dom');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
}

export default Client;
