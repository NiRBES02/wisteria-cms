import { ConfigManager } from '../../../../utils/config-manager.js';

// NiRBES: рефакторинг структуры, фикс сохранения конфига и типизации веток.
export default async function createMessageSupport(context, client) {
  try {
    const configManager = context.config;
    const config = configManager.get();

    const threadId = config.threads.support;
    if (!threadId) {
      return context.log('Ошибка: ID ветки саппорта не задан в конфигурации');
    }

    // Получаем канал/ветку
    const thread = await client.channels.fetch(threadId);

    // Проверяем, является ли канал веткой (thread)
    if (!thread.isThread()) {
      return context.log(`Ошибка: Указанный ID <${threadId}> не является веткой (ThreadChannel)`);
    }

    let message = null;
    if (config.messages?.support) {
      try {
        message = await thread.messages.fetch(config.messages.support);
      } catch (e) {
        message = null; // Сообщение удалено или недоступно
      }
    }

    if (!message) {
      const messageNew = await thread.send({
        content: [
          '**Памятка для обращения в поддержку**',
          'Для быстрой помощи, пожалуйста, отправьте данные по списку:\n',
          '* **Инфо:** Ваш ник.',
          '* **Операционная система:** (Windows, macOS, Linux).',
          '* **Где проблема?** (Лаунчер / Клиент / Сайт / Другое)',
          '* **Что случилось?** Краткое описание и ваши действия.',
          '* **Скриншот / Видео:** Снимок экрана или ссылка на запись ошибки.',
          '**Логи:** Файл `latest.log` (если проблема с игрой или лаунчером).\n',
          '> Чем подробнее описание, тем быстрее мы сможем помочь!'
        ].join('\n').trim()
      });

      // Фикс: сохраняем старые сообщения, обновляя только support
      await configManager.save({
        ...config,
        messages: {
          ...config.messages,
          support: messageNew.id,
        }
      });

      context.log(`Новое сообщение <${messageNew.id}> успешно создано в ветке <${thread.name}>`);
    } else {
      context.log('Сообщение в ветке уже существует, пропускаем создание');
    }
  } catch (error) {
    context.log(`Error createMessageSupport(): `, error);
  }
}