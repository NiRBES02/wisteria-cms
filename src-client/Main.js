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

/*
TODO:
Добавить уникальную систему сборки скриптов модулей в appliction директориях:
Например есть файл /application/modules/navbar/public/js/auth.js, сделать его как src файл и билдить уже для рендера.
Зачем это нужно? Тянуть весь flowbite слишком жирно, хотя она уже есть через `ds.flowbite.*`, все равно неправильно так делать... 
*/