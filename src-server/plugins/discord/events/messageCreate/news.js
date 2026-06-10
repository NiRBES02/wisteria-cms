export default async function news(context, message) {
  try {
    const configManager = context.config;
    const config = configManager.get();

    const adminRoles = Array.isArray(config.roles.admin) ? config.roles.admin : [config.roles.admin];
    if (!adminRoles.some(roleId => message.member?.roles.cache.has(roleId))) return;

    if (message.channelId !== config.channels.news) return;

    const channel = await message.client.channels.fetch(config.channels.news);

    const lines = message.content.trim().split('\n');
    const firstLine = lines[0];

    const argsArray = firstLine.split(/\s+/);
    const args = context.cli.registry.parseArgs(argsArray);

    let cleanMessage = '';
    if (lines.length > 1) {
      cleanMessage = lines.slice(1).join('\n');
    } else {
      cleanMessage = args.unknown.join(' ');
    }

    if (!cleanMessage.trim()) {
      context.log('Текст сообщения пуст после фильтрации флагов');
      return;
    }

    if (args.flags.everyone || args.flags.e) {
      context.log('everyone true');
      cleanMessage = `||@everyone||\n\n${cleanMessage}`;
    }

    await channel.send(cleanMessage);

  } catch (err) {
    context.log('Ошибка отправки новости: ', err);
  }
}