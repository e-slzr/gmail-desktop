document.addEventListener('DOMContentLoaded', () => {
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');
  const btnReload = document.getElementById('btn-reload');
  const dragRegion = document.getElementById('drag-region');
  const unreadBadge = document.getElementById('unread-badge');
  const windowTitle = document.getElementById('window-title');

  const iconMax = document.getElementById('icon-max');
  const iconRestore = document.getElementById('icon-restore');

  if (window.electronAPI) {
    btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
    btnMaximize.addEventListener('click', () => window.electronAPI.maximize());
    btnClose.addEventListener('click', () => window.electronAPI.close());
    btnReload.addEventListener('click', () => window.electronAPI.reload());

    // Double click to toggle maximize
    dragRegion.addEventListener('dblclick', () => window.electronAPI.maximize());

    // Toggle maximize/restore icon
    window.electronAPI.onMaximizeChange((isMaximized) => {
      if (isMaximized) {
        iconMax.style.display = 'none';
        iconRestore.style.display = 'block';
        btnMaximize.title = 'Restaurar';
      } else {
        iconMax.style.display = 'block';
        iconRestore.style.display = 'none';
        btnMaximize.title = 'Maximizar';
      }
    });

    // Unread badge
    window.electronAPI.onUnreadUpdate((unreadCount) => {
      if (unreadCount && unreadCount > 0) {
        unreadBadge.textContent = unreadCount;
        unreadBadge.style.display = 'inline-block';
      } else {
        unreadBadge.style.display = 'none';
      }
    });

    // Window title
    window.electronAPI.onTitleUpdate((title) => {
      if (title && title !== 'Gmail') {
        windowTitle.textContent = title;
      } else {
        windowTitle.textContent = '';
      }
    });

    // View bounds sync
    function syncWindowDimensions() {
      if (window.electronAPI && window.electronAPI.sendResize) {
        window.electronAPI.sendResize(window.innerWidth, window.innerHeight);
      }
    }
    window.addEventListener('resize', syncWindowDimensions);
    syncWindowDimensions();
    setTimeout(syncWindowDimensions, 50);
    setTimeout(syncWindowDimensions, 200);
    setTimeout(syncWindowDimensions, 500);
  }
});
