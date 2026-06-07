import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import { EmbedBuilder } from 'discord.js';

const warnsStorage = new Map();

const WARN_EXPIRATION = 2 * 60 * 60 * 1000;
const MUTE_30_MIN = 30 * 60 * 1000;
const MUTE_2_HOURS = 120 * 60 * 1000;

export default async function moderate(context, message) {
    try {
        const txt = path.join(context.dir, 'instruction.txt');
        const instruction = await fs.readFile(txt, 'utf-8');
        const configManager = context.config;
        const config = configManager.get();

        const adminRoles = Array.isArray(config.roles.admin) ? config.roles.admin : [config.roles.admin];

        if (adminRoles.some(roleId => message.member?.roles.cache.has(roleId))) {
            context.log('Сообщение от пользователя с админской ролью пропущено для модерации.');
            return;
        }

        const response = await ollama.chat({
            model: process.env.OLLAMA_MODEL,
            messages: [
                { role: 'system', content: instruction },
                { role: 'user', content: message.content }
            ],
            format: 'json',
            options: { temperature: 0.1 }
        });

        if (!response.message || !response.message.content) {
            context.log('Ответ от модели не содержит ожидаемого поля messages.content.');
            return;
        }

        context.log('Ответ от модели для модерации:', response.message.content);
        const moderation = JSON.parse(response.message.content);

        if (moderation.isViolation) {
            const userId = message.author.id;
            const now = Date.now();

            let userWarns = warnsStorage.get(userId) || [];
            userWarns = userWarns.filter(timestamp => (now - timestamp) < WARN_EXPIRATION);

            userWarns.push(now);
            warnsStorage.set(userId, userWarns);

            const violationCount = userWarns.length;
            let muteDuration = 0;
            let actionText = 'Предупреждение';

            if (violationCount === 2) {
                muteDuration = MUTE_30_MIN;
                actionText = 'Мут на 30 минут (2-е нарушение)';
            } else if (violationCount >= 3) {
                muteDuration = MUTE_2_HOURS;
                actionText = `Мут на 2 часа (${violationCount}-е нарушение)`;
            }

            const warningText = muteDuration > 0
                ? `${message.author}, нарушение правил! ${moderation.warningMessage}\nВы получили мут!`
                : `${message.author}, ${moderation.warningMessage}\nБудьте внимательнее, следующее нарушение приведет к муту!`;

            await message.channel.send(warningText);
            await message.delete().catch(err => context.log('Не удалось удалить сообщение:', err));

            if (muteDuration > 0) {
                if (message.member && message.member.moderatable) {
                    await message.member.timeout(muteDuration, `Автомодерация (${violationCount} нарушения): ${moderation.reason}`);
                    context.log(`Пользователь ${message.author.tag} замучен на ${muteDuration / 60000} мин.`);
                } else {
                    context.log(`Не удалось выдать таймаут ${message.author.tag} (недостаточно прав).`);
                }
            }

            await sendLogMod(context, message, moderation.reason, actionText, violationCount);
        }
    } catch (err) {
        context.log('Ошибка при модерации сообщения:', err);
    }
}

async function sendLogMod(context, message, reason, actionText, violationCount) {
    try {
        const configManager = context.config;
        const config = configManager.get();
        const channel = await message.client.channels.fetch(config.channels.moderate_log);

        const embed = new EmbedBuilder()
            .setColor(violationCount >= 3 ? 0xff6467 : 0xc27aff)
            .setTitle('Обнаружено нарушение')
            .addFields(
                { name: 'Пользователь', value: `${message.author} (${message.author.id})`, inline: true },
                { name: 'Активных нарушений', value: `${violationCount}`, inline: true },
                { name: 'Примененное действие', value: actionText },
                { name: 'Сообщение', value: message.content || 'Нет текста' },
                { name: 'Причина', value: reason || 'Не указана' }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (err) {
        context.log('Ошибка при отправке логов модерации:', err);
    }
}