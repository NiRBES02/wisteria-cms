import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Client, GatewayIntentBits } from 'discord.js';
import BasePlugin from '../../utils/base-plugin.js';
import { ConfigManager } from '../../utils/config-manager.js';

/**
 * NiRBES: Данный плагин в скором времени будет переписан, так что не питайте на него большие надежды!
 */

export default class DiscordBotPlugin extends BasePlugin {
    constructor(context) {
        super(context);
        this.client = null;
    }

    async onLoad() {
        this.context.log('Plugin status: loading');

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.context.config = new ConfigManager(this.context.dir + '/data.json', this.context);

        const eventsPath = path.join(this.context.dir, 'events');
        try {
            const files = await fs.readdir(eventsPath);
            const eventFiles = files.filter(file => file.endsWith('.js'));

            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);

                const fileUrl = pathToFileURL(filePath).href;

                const event = await import(fileUrl);
                const eventData = event.default || event;

                if (eventData.once) {
                    this.client.once(eventData.name, (...args) => eventData.execute(this.context, ...args));
                } else {
                    this.client.on(eventData.name, (...args) => eventData.execute(this.context, ...args));
                }
            }
        } catch (err) {
            this.context.log('Ошибка при чтении папки событий:', err.message);
        }

        const token = process.env.DISCORD_TOKEN;
        await this.client.login(token).catch(err => {
            this.context.log('Ошибка авторизации в Discord:', err.message);
        });
    }

    async onLoaded() {
        this.context.log('Plugin status: loaded');
    }

    async onDisable() {
        this.context.log('Plugin status: disabling');
        try {
            if (this.client) await this.client.destroy();
        } catch (err) {
            this.context.log('Ошибка при уничтожения сессии:', err);
        }
    }

    async onDisabled() {
        this.context.log('Plugin status: disabled');
    }
}