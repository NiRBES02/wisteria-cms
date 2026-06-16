ds.event.once('content.loaded', () => {

  const form = document.getElementById('formRegister');
  const iconUser = document.getElementById('icon-user');
  const iconAt = document.getElementById('icon-at');

  const showPasswordBtn = document.getElementById('showPassword');
  const iconShowPassword = document.getElementById('icon-show-password');

  let showAt = false;

  showPasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    iconShowPassword.classList.toggle('fa-eye', !isPassword);
    iconShowPassword.classList.toggle('fa-eye-slash', isPassword);
  });


  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(form);

      const response = await fetch('/auth/api/register', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });

      if (!response.ok) throw new Error('Ошибка соединения');

      const data = await response.json();

      if (data.notify) {
        await ds.notify(data.notify.message, data.notify.type);
        if (data.notify.type === 'success') {
          await Promise.all([ds.content.load('/'), ds.event.emit('auth.registered')]);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {

    }
  });
});
