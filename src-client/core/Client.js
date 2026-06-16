import ContentManager from './ContentManager.js';
import ContentRouter from './ContentRouter.js';

import Event from '@f/Event';
import NProgress from '@u/NProgress';
import Flowbite from '@u/Flowbite';

import Notify from '../functions/Notify.js';

class Client {
  constructor() {
    this.content = ContentManager;
    this.event = Event;
    this.np = NProgress;
    this.notify = Notify;
    this.flowbite = Flowbite;
  }
}

export default new Client();