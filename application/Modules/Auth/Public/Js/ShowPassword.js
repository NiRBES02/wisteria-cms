ds.event.once('content.loaded', () => {
  const showPasswordBtn = document.getElementById('showPassword');
  const iconShowPassword = document.getElementById('icon-show-password');
  showPasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    iconShowPassword.classList.toggle('fa-eye', !isPassword);
    iconShowPassword.classList.toggle('fa-eye-slash', isPassword);
  });
});
