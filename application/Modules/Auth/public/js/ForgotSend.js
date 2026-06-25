ds.event.once('content.loaded', () => {

  const form = document.getElementById('formForgot');
  const button = document.getElementById('btnForgot');

  const processLoading = () => {
    const originalText = button.textContent;
    const wasDisabled = button.disabled;

    button.textContent = 'Отправка...';
    button.disabled = true;

    return () => {
      button.textContent = originalText;
      button.disabled = wasDisabled;
    };
  };





  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const resButton = processLoading();
    try {
      const formData = new FormData(form);

      const response = await fetch('/auth/api/forgotSendMail', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка соединения');

      const data = await response.json();

      if (data.notify) {
        await ds.notify(data.notify.message, data.notify.type);
        if (data.notify.type === 'success') {
          // await Promise.all([ds.content.load('/'), ds.event.emit('auth.loggedIn')]);
          return;
        }
      }

      await ds.delay(2000);

    } catch (err) {
      console.error(err);
    } finally {
      resButton();
    }
  });
});
