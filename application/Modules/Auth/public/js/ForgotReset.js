ds.event.once('content.loaded', () => {

  const form = document.getElementById('formForgot');

  const showPasswordBtn = document.getElementById('showPassword');
  const iconShowPassword = document.getElementById('icon-show-password');
  const button = document.getElementById('btnReset');

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


  let showAt = false;

  showPasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    iconShowPassword.classList.toggle('fa-eye', !isPassword);
    iconShowPassword.classList.toggle('fa-eye-slash', isPassword);
  });

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
          await Promise.all([ds.content.load('/'), ds.event.emit('auth.loggedIn')]);
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
