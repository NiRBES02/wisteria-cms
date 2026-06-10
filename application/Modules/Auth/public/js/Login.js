ds.event.once('content.loaded', () => {

  const form = document.getElementById('formLogin');
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

  const changeIconLogin = () => {
    showAt = !showAt;

    if (showAt) {
      iconUser.classList.replace('opacity-100', 'opacity-0');
      iconUser.classList.replace('scale-100', 'scale-50');

      iconAt.classList.replace('opacity-0', 'opacity-100');
      iconAt.classList.replace('scale-50', 'scale-100');
    } else {
      iconAt.classList.replace('opacity-100', 'opacity-0');
      iconAt.classList.replace('scale-100', 'scale-50');

      iconUser.classList.replace('opacity-0', 'opacity-100');
      iconUser.classList.replace('scale-50', 'scale-100');
    }
  };

  setInterval(changeIconLogin, 4000);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(form);
      // formData.append('client', JSON.stringify(ds.ua.getResult()));

      const response = await fetch('/auth/api/login', {
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
    } catch (err) {
      console.error(err);
    } finally {

    }
  });
});
