const { app, BrowserWindow, WebContentsView, ipcMain, shell, nativeTheme, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const TITLEBAR_HEIGHT = 44;
const GMAIL_URL = 'https://mail.google.com/mail/u/0/';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

app.setName('Gmail');
app.setAppUserModelId('com.google.GmailDesktop');

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

function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  return { width: 1150, height: 750, isMaximized: false };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getNormalBounds ? mainWindow.getNormalBounds() : mainWindow.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
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
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1150,
    height: state.height || 750,
    x: state.x,
    y: state.y,
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

  if (state.isMaximized) {
    mainWindow.maximize();
  }

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

  // Asegurar que las dimensiones de la vista abarquen toda la ventana de inmediato
  updateViewBounds();
  setTimeout(updateViewBounds, 50);
  setTimeout(updateViewBounds, 250);

  // Configurar permisos de sesión (Habilitar notificaciones web para Gmail)
  const session = gmailView.webContents.session;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(true); // Conceder permiso automáticamente
    } else {
      callback(false);
    }
  });
  session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'notifications';
  });

  // Limpiar el UserAgent para que Google reconozca el navegador como Chrome estándar
  const defaultUA = gmailView.webContents.userAgent;
  const cleanUA = defaultUA.replace(/Electron\/[0-9\.]+\s?/, '').replace(/gmail-desktop\/[0-9\.]+\s?/, '');
  gmailView.webContents.setUserAgent(cleanUA);

  // Cargar Gmail
  gmailView.webContents.loadURL(GMAIL_URL);

  // Manejadores exhaustivos de redimensionado para garantizar que nunca queden huecos
  mainWindow.on('resize', updateViewBounds);
  mainWindow.on('show', updateViewBounds);
  mainWindow.on('restore', updateViewBounds);

  mainWindow.on('maximize', () => {
    updateViewBounds();
    mainWindow.webContents.send('window-maximize-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    updateViewBounds();
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

    // Notificación del sistema si entra correo nuevo y la ventana no está enfocada
    const now = Date.now();
    if (count > lastUnreadCount && (now - lastNotificationTime) > 4000) {
      if (!mainWindow.isFocused() || !mainWindow.isVisible()) {
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

  // Guardar estado de la ventana periódicamente y al cerrar
  mainWindow.on('close', (event) => {
    saveWindowState();
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
  if (mainWindow) {
    saveWindowState();
    mainWindow.hide();
  }
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
  saveWindowState();
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
