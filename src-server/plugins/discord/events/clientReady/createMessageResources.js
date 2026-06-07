import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { ConfigManager } from '../../../../utils/config-manager.js';

export default async function createMessageResources(context, client) {
    try {
        const exampleEmbed = new EmbedBuilder()
            .setColor(0xc27aff)
            .setTitle('Краткая информация')
            .addFields(
                { name: 'Наш сайт', value: 'На нашем сайте вы сможете зарегистрироваться, установить лаунчер, сменить свой пароль и т.п.' },
                { name: 'Форум', value: 'На форуме вы сможете найти полезные гайды, подать какие то заявки и прочее.' },
                { name: 'Поддержка', value: 'Вы можете обратиться в службу поддержки за помощью' },
                { name: 'Разработчикам', value: 'Null' },

            );

        const btnSite = new ButtonBuilder()
            .setLabel('Сайт')
            .setURL('https://wisteriamc.ru')
            .setStyle(ButtonStyle.Link);

        const btnForum = new ButtonBuilder()
            .setLabel('Форум')
            .setURL('https://forum.wisteriamc.ru')
            .setStyle(ButtonStyle.Link);

        const btnSupport = new ButtonBuilder()
            .setLabel('Поддержка')
            .setURL('https://wisteriamc.ru/?router=support')
            .setStyle(ButtonStyle.Link);

        const btnDev = new ButtonBuilder()
            .setLabel('Разработчикам')
            .setURL('https://wisteriamc.ru/?router=dev')
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder().addComponents(
            btnSite,
            btnForum,
            btnSupport,
            btnDev,
        );

        const configManager = context.config;
        const config = configManager.get();

        const channelId = config.channels?.resources;
        if (!channelId) {
            return context.log('Ошибка: channel ID not specified in config',);
        }

        const channel = await client.channels.fetch(channelId);
        let message = null;
        if (config.messages?.resources) {
            try {
                message = await channel.messages.fetch(config.messages.resources);
            } catch (e) {
                message = null;
            }
        }

        if (!message) {
            const messageNew = await channel.send({
                embeds: [exampleEmbed],
                components: [row],
            });

            await configManager.save({
                messages: {
                    resources: messageNew.id,
                }
            });

            context.log(`Новое сообщение <${messageNew.id}> успешно создано в канале <${channel.name}>`);
        } else {
            context.log('Сообщение уже существует, пропускаем создание');
        }
    } catch (error) {
        context.log(`Error createMessageResources(): `, error);
    }
}