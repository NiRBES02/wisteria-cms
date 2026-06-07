import ContentManager from './ContentManager.js';
// import SocketManager from './SocketManager.js';
import ContentRouter from './ContentRouter.js';

import Event from '@f/Event';

class Client {
  constructor() {
    this.content = ContentManager;
    // this.socket = SocketManager;
    this.event = Event;
  }
}

export default new Client();