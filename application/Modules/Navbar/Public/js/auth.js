async function drawerInit() {
    // ноды
    const nodes = {
        target: document.getElementById('drawer-js-example'),
        toggle: document.getElementById('drawer-toggle-button'),
        close: document.getElementById('drawer-close-button'),
    };

    const options = {
        placement: 'right',
        backdrop: true,
        bodyScrolling: false,
        backdropClasses: 'bg-black/75 fixed inset-0 z-30 backdrop-blur-sm',
    };

    const instance = {
        id: 'drawer-js-example',
        override: true,
    };

    if (!nodes.target || !nodes.toggle || !nodes.close) {
        console.log('Элемент navbar.drawer не найден');
        return;
    }

    const drawer = new ds.flowbite.Drawer(nodes.target, options, instance);

    nodes.toggle.onclick = () => drawer.toggle();
    nodes.close.onclick = () => drawer.hide();

    nodes.target.onclick = e => {
        if (e.target.closest('a')) drawer.hide();
    };
}

async function dropdownInit() {
    const nodes = {
        target: document.getElementById('ddAvatarMenu'),
        toggle: document.getElementById('ddAvatarToggle'),
    };

    const options = {
        placement: 'bottom',
        triggerType: 'click',
        offsetSkidding: 0,
        offsetDistance: 10,
        delay: 300,
        ignoreClickOutsideClass: false,
    };

    const instance = {
        id: 'ddAvatarMenu',
        override: true,
    };

    if (!nodes.target || !nodes.toggle) {
        console.warn('Элемент navbar.dropdown не найден');
        return;
    }

    const dropdown = new ds.flowbite.Dropdown(
        nodes.target,
        nodes.toggle,
        options,
        instance,
    );
}

async function processLogout() {
    try {
        const response = await fetch('/auth/api/logout', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });

        if (!response.ok) {
            throw new Error(`Сервер ответил кодом ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            throw new Error('Сервер прислал HTML вместо JSON');
        }

        const data = await response.json();

        if (!data.notify?.type) {
            console.warn('Ответ от сервера не пришел', 'warning');
        }
        await ds.notify(data.notify.message, data.notify.type);

        if (data.notify.type === 'success') {
            await Promise.all([ds.content.load('/'), ds.event.emit('auth.unlogining')]);
            return;
        }

    } catch (error) {
        console.log(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleLogout() {
    const nodes = {
        trigger: document.getElementById('logout'),
    };

    if (!nodes.trigger) {
        console.warn('Элемент logout не найден');
        return;
    }

    nodes.trigger.onclick = async () => {
        await processLogout();
    };
}

ds.event.once('content.loaded', async () => {
    try {
        await dropdownInit();
        await handleLogout();
    } catch (e) {
        console.error(e);
    }
});