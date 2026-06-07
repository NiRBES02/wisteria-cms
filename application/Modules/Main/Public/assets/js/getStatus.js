ds.event.once('loaded', () => {
    const lastUpdate = {};

    // setInterval(() => {
    //     const rand = Math.floor(Math.random() * 100) + 1;
    //     const rand2 = Math.floor(Math.random() * 100) + 1;
    //     ds.socket.send('message_to', {
    //         target: 'NiRBES',
    //         event: 'mc_server_getData',
    //         data: { message: 'Получение данных', status: 'OK', 'players': rand, server_id: 'server-ic2' }
    //     });
    //     // ds.socket.send('message_to', {
    //     //     target: 'NiRBES',
    //     //     event: 'mc_server_getData',
    //     //     data: { message: 'Получение данных', status: 'OK', 'players': rand2, server_id: 'server-ic2-s2' }
    //     // });
    // }, 5000);

    ds.socket.send('message_to', {
        target: 'all',
        event: 'mc_server_fetch',
        data: { status: 'OK' }
    });

    ds.socket._socket.on('mc_server_getData', (data) => {
        console.log(data);
        const serverId = data.server_id;
        const players = data.players;
        const maxPlayers = data.maxPlayers;
        const card = document.querySelector(`[data-mc-server-id="${serverId}"]`);
        if (card) {
            const playerSpan = card.querySelector('.player-status');
            if (playerSpan) {
                playerSpan.innerHTML = `<span class="text-xl">${players}</span><span class="text-zinc-500">/${maxPlayers}</span>`;
                lastUpdate[serverId] = Date.now();
            }
        }
    });

    // // Проверка на неактивность каждые 5 секунд
    // setInterval(() => {
    //     const now = Date.now();
    //     document.querySelectorAll('[data-mc-server-id]').forEach(card => {
    //         const serverId = card.getAttribute('data-mc-server-id');
    //         if (!lastUpdate[serverId] || now - lastUpdate[serverId] > 10000) {
    //             const playerSpan = card.querySelector('.text-xl');
    //             if (playerSpan) {
    //                 playerSpan.textContent = 'неактивен';
    //             }
    //         }
    //     });
    // }, 5000);

});



