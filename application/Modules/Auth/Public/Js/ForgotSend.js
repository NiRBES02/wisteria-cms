ds.event.once('content.loaded', () => {

  const form = document.getElementById('formAuth');
  const button = document.getElementById('btnSubmit');

  const processLoading = () => {
    const originalText = button.textContent;
    const wasDisabled = button.disabled;

    button.textContent = 'Авторизация...';
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
      formData.append('client', JSON.stringify(ds.uap.getResult()));

      const response = await fetch('/auth/api/ForgotResetPassword', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка соединения');

      const data = await response.json();

      if (data.notify) {
        await ds.notify(data.notify.message, data.notify.type);
        if (data.notify.type === 'success') {
          await Promise.all([ds.content.load('/')]);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      resButton();
    }
  });
});
