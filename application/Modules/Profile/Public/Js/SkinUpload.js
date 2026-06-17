ds.event.once('content.loaded', async () => {
  const skinInput = document.getElementById('skinInput');
  const skinLabel = document.getElementById('skinLabel');

  if (!skinLabel && !skinLabel) return;

  skinInput.addEventListener('change', async (e) => {
    const file = skinInput.files[0];

    if (!file) {
      await ds.notify('Вы не загрузили изображение', 'error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      await ds.notify('Пожалуйста загрузите изображение PNG', 'error');
      skinInput.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      await ds.notify('Файл слишком большой. Максимальный размер 5Mb.');
      skinInput.value = '';
      return;
    }


    skinLabel.disabled = true;


    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/profile/api/SkinUpload', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }

      const data = await response.json();

      await ds.notify(data.notify.message, data.notify.type);

      if (data.notify.type === 'success') {
        await Promise.all([ds.content.load('/profile/person'), ds.event.emit('skin.uploaded')]);
        return;
      }
    } catch (error) {
      console.error('Error:', error);
      await ds.notify('Ошибка загрузки скина. Попробуйте позже.', 'error');
    } finally {
      skinLabel.disabled = false;
    }
  });
});
