ds.event.once('content.loaded', async () => {
  const skin = document.getElementById('skin');
  if (!skin) return;

  try {
    const hash = document.querySelectorAll('[data-skin-view-hash]');
    let skinViewer = new ds.skin.SkinViewer({
      canvas: skin,
      skin: `/skin/api/index`,
    });

    skinViewer.width = skin.offsetWidth;
    skinViewer.height = 256;
    skinViewer.fov = 70;
    skinViewer.zoom = 0.9;
    skinViewer.controls.enableZoom = false;

    const animation = new ds.skin.IdleAnimation();
    skinViewer.animation = animation;

    ds.event.once('content.unloaded', () => {
      if (skinViewer) {
        skinViewer.dispose();
      }
    });
  } catch (err) {
    await ds.notify('SkinView3D: ' + err, 'error');
  }
});


ds.event.on('content.loaded', async () => {
  const skinElements = document.querySelectorAll('[data-skin-hash]');

  if (!skinElements.length) return;

  const skinViewers = new Map();

  try {
    for (const skinElement of skinElements) {
      const skinHash = skinElement.getAttribute('data-skin-hash');
      if (!skinHash) continue;

      const skinUrl = `/skin/api/index?hash=${skinHash}`;

      try {
        let skinViewer = new ds.skin.SkinViewer({
          canvas: skinElement,
          skin: skinUrl,
        });

        skinViewer.width = skinElement.offsetWidth;
        skinViewer.height = skinElement.offsetWidth - 32;
        skinViewer.fov = 70;
        skinViewer.zoom = 0.9;
        skinViewer.controls.enableZoom = false;

        const animation = new ds.skin.IdleAnimation();
        skinViewer.animation = animation;

        skinViewers.set(skinElement, skinViewer);

      } catch (viewerErr) {
        console.error(`Ошибка при создании SkinViewer для hash ${skinHash}:`, viewerErr);
        await ds.notify(`SkinView3D (hash ${skinHash}): ${viewerErr}`, 'error');
      }
    }
  } catch (err) {
    await ds.notify('SkinView3D: ' + err, 'error');
  }

  ds.event.once('content.unloaded', () => {
    for (const [element, viewer] of skinViewers) {
      if (viewer) {
        viewer.dispose();
      }
      skinViewers.delete(element);
    }
  });
});
