
import { Events } from 'discord.js';

// NiRBES: Что бы не захламлять основной файл события, выносим всю логику взаимодействий с сообщениями в отдельное место.
// import moderate from './messageCreate/moderate.js';
import news from './messageCreate/news.js';

export default {
    name: Events.MessageCreate,
    async execute(context, message) {
        if (message.author.bot) return;

        // NiRBES: Так как сейчас нет возможности отключить или включить подмодули плагинов, то приходится пользоваться такими примитивными способами, хочешь отключить модерацию сообщений в дискорде, просто закоментируй/удали строчку снизу
        // await moderate(context, message);

        await news(context, message);
    }
};