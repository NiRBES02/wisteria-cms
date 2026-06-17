function loadChart(element) {
    const getBrandColor = () => {
        const computedStyle = getComputedStyle(document.documentElement);
        return (computedStyle.getPropertyValue('--color-purple-400').trim() || '#1447E6');
    };

    const options = {
        series: [50],
        colors: [getBrandColor()],
        chart: {
            height: '100%',
            type: 'radialBar',
        },
        plotOptions: {
            radialBar: {
                hollow: {
                    show: false,
                    size: '65%',
                },
                track: { show: true, background: 'transparent' },
                dataLabels: {
                    name: { show: false },
                    value: { show: false }
                }
            }
        },
        labels: ['Выполнено']
    };

    const chart = new ds.apex(element, options);
    chart.render();
}

function initAchievementPopovers() {
    document.querySelectorAll('[data-popover-target]').forEach(($triggerEl) => {
        const popoverID = $triggerEl.dataset.popoverTarget;
        const $popoverEl = document.getElementById(popoverID);

        if (!$popoverEl) {
            console.error(`Popover target element with id "${popoverID}" not found.`);
            return;
        }

        new ds.flowbite.Popover($popoverEl, $triggerEl, {
            placement: 'bottom',
            offset: 10,
            triggerType: 'hover',
        }, {
            id: popoverID,
            override: true,
        });
    });
}

ds.event.once('content.loaded', () => {
    const chartElement = document.querySelector('#chartAdvanced');
    if (chartElement) {
        loadChart(chartElement);
    }
    initAchievementPopovers();
});
