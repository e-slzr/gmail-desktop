const { app, BrowserWindow, WebContentsView, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const TITLEBAR_HEIGHT = 44;
const GMAIL_URL = 'https://mail.google.com/mail/u/0/';

// Configuración de instancia única
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let gmailView = null;
let lastUnreadCount = 0;
let lastNotificationTime = 0;

function isGoogleUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return host === 'google.com' ||
           host.endsWith('.google.com') ||
           host.endsWith('.gstatic.com') ||
           host.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

function updateViewBounds() {
  if (!mainWindow || !gmailView) return;
  const [width, height] = mainWindow.getContentSize();
  gmailView.setBounds({
    x: 0,
    y: TITLEBAR_HEIGHT,
    width: width,
    height: Math.max(0, height - TITLEBAR_HEIGHT)
  });
}

function createWindow() {
  const isDark = nativeTheme.shouldUseDarkColors;
  const bgColor = isDark ? '#1f1f1f' : '#f6f8fc';

  mainWindow = new BrowserWindow({
    width: 1150,
    height: 750,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    backgroundColor: bgColor,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Cargar la barra de título personalizada en la ventana principal
  mainWindow.loadFile(path.join(__dirname, 'titlebar.html'));

  // Crear la vista web para Gmail con sesión persistente
  gmailView = new WebContentsView({
    webPreferences: {
      partition: 'persist:gmail',
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  mainWindow.contentView.addChildView(gmailView);
  updateViewBounds();

  // Limpiar el UserAgent para que Google reconozca el navegador como Chrome estándar
  const defaultUA = gmailView.webContents.userAgent;
  const cleanUA = defaultUA.replace(/Electron\/[0-9\.]+\s?/, '').replace(/gmail-desktop\/[0-9\.]+\s?/, '');
  gmailView.webContents.setUserAgent(cleanUA);

  // Cargar Gmail
  gmailView.webContents.loadURL(GMAIL_URL);

  // Manejo de redimensionado de ventana
  mainWindow.on('resize', updateViewBounds);

  // Estados de maximizado para actualizar icono en la barra
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximize-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximize-changed', false);
  });

  // Interceptar apertura de ventanas (links en correos)
  gmailView.webContents.setWindowOpenHandler(({ url }) => {
    if (isGoogleUrl(url)) {
      gmailView.webContents.loadURL(url);
      return { action: 'deny' };
    }
    // Enlaces externos a sitios de terceros se abren en el navegador predeterminado
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Interceptar navegación directa a páginas externas
  gmailView.webContents.on('will-navigate', (event, url) => {
    if (!isGoogleUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Monitoreo de título y contador de correos no leídos
  gmailView.webContents.on('page-title-updated', (_event, title) => {
    mainWindow.setTitle(title || 'Gmail');

    const match = title.match(/\(([\d,]+)\)/);
    const count = match ? parseInt(match[1].replace(',', ''), 10) : 0;

    // Actualizar insignia en la barra de título
    mainWindow.webContents.send('update-unread', count);
    mainWindow.webContents.send('update-title', title);

    // Notificación del sistema si entra correo y la ventana no está enfocada
    const now = Date.now();
    if (count > lastUnreadCount && (now - lastNotificationTime) > 4000) {
      if (!mainWindow.isFocused() || !mainWindow.isVisible()) {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
          const diff = count - lastUnreadCount;
          const msg = diff > 1 ? `Tienes ${diff} nuevos correos en Gmail` : 'Tienes un nuevo correo en Gmail';
          const notif = new Notification({
            title: 'Gmail',
            body: msg,
            icon: path.join(__dirname, '../assets/icon.png')
          });
          notif.on('click', () => {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          });
          notif.show();
          lastNotificationTime = now;
        }
      }
    }
    lastUnreadCount = count;
  });

  // Al cerrar la ventana, ocultarla en segundo plano para arranque instantáneo (0ms)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// IPC Handlers para los botones de la barra de título
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('window-reload', () => {
  if (gmailView) gmailView.webContents.reload();
});

// Despertar la ventana existente si el usuario intenta abrir otra instancia
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
