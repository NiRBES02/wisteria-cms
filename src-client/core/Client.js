import ContentManager from './ContentManager.js';
import ContentRouter from './ContentRouter.js';

import Event from '@f/Event';
import NProgress from '@u/NProgress';
import Flowbite from '@u/Flowbite';
import ApexCharts from '@u/Apex.js';
import Skin from '@u/SkinView3D';
import { delay } from '@f/Delay';
import UAP from '@u/UAParser';

import Notify from '../functions/Notify.js';

class Client {
  constructor() {
    this.content = ContentManager;
    this.event = Event;
    this.np = NProgress;
    this.notify = Notify;
    this.flowbite = Flowbite;
    this.apex = ApexCharts;
    this.skin = Skin;
    this.delay = delay;
    this.uap = new UAP();
  }
}

export default new Client();