ds.event.once('loaded', () => {
  const $targetEl = document.getElementById('popup-modal');
  const options = {
    placement: 'bottom-right',
    backdrop: 'dynamic',
    backdropClasses: 'bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40',
    closable: true,
    onHide: () => {
      console.log('modal is hidden');
    },
    onShow: () => {
      console.log('modal is shown');
    },
    onToggle: () => {
      console.log('modal has been toggled');
    },
  };

  const instanceOptions = {
    id: 'popup-modal',
    override: true,
  };

  const modal = new ds.flowbite.Modal($targetEl, options, instanceOptions);

  // modal.show()
});
