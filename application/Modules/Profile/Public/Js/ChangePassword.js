ds.event.once('content.loaded', async () => {
    const form = document.querySelector('form[name="changePassword"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            const formData = new FormData(form);
            const response = await fetch('/profile/api/ChangePassword', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            const { message, type } = data.notify;

            await ds.notify(message, type)
        } catch (error) {
            console.log('Error change password: ', error.message);
        }
    });
});
