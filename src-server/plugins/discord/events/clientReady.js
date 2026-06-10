
import { Events } from 'discord.js';

// NiRBES: Что бы не захламлять основной файл события, выносим всю логику взаимодействий с клиентом в отдельное место.
import clientReady from './clientReady/clientReady.js';
import createMessageResources from './clientReady/createMessageResources.js';
import createMessageSupport from './clientReady/createMessageSupport.js';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(context, client) {
        await clientReady(context, client);
        await createMessageResources(context, client);
        await createMessageSupport(context, client);
    }
};