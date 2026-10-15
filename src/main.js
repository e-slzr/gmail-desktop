const { app, BrowserWindow, WebContentsView, ipcMain, shell, nativeTheme, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// Permitir reproducción de audio de notificaciones sin interacción previa
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const TITLEBAR_HEIGHT = 44;
const GMAIL_URL = 'https://mail.google.com/mail/u/0/';
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

app.setName('Gmail');
app.setAppUserModelId('com.eslzr.gmail-desktop');
if (process.platform === 'linux' && typeof app.setDesktopName === 'function') {
  app.setDesktopName('gmail-desktop.desktop');
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let gmailView = null;
let lastUnreadCount = 0;
let lastNotificationTime = 0;
let pendingTitleNotification = null;
let resolvedSystemIcon = undefined;

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

// Comprueba si alguno de los nombres de icono candidatos existe en el tema del sistema Linux
function checkSystemIconAvailable(candidateNames) {
  if (process.platform !== 'linux') return null;
  const names = Array.isArray(candidateNames) ? candidateNames : [candidateNames];

  const home = os.homedir();
  const baseDirs = [
    path.join(home, '.local/share/icons'),
    path.join(home, '.icons'),
    '/usr/local/share/icons',
    '/usr/share/icons',
    '/usr/share/pixmaps'
  ];

  const exts = ['.svg', '.png', '.xpm'];

  const themes = new Set();
  try {
    const stdout = execSync('gsettings get org.gnome.desktop.interface icon-theme', { encoding: 'utf8', timeout: 500 }).trim();
    const currentTheme = stdout.replace(/^['\"]|['\"]$/g, '');
    if (currentTheme) themes.add(currentTheme);
  } catch (e) {}
  themes.add('hicolor');

  for (const name of names) {
    // 1. Comprobar directamente en pixmaps
    for (const ext of exts) {
      if (fs.existsSync(path.join('/usr/share/pixmaps', name + ext))) {
        return name;
      }
    }

    // 2. Comprobar en tema activo y tema fallback hicolor
    for (const base of baseDirs) {
      if (!fs.existsSync(base)) continue;
      for (const theme of themes) {
        const themePath = path.join(base, theme);
        if (!fs.existsSync(themePath)) continue;
        const subdirs = [
          'apps/scalable', 'scalable/apps', 'apps',
          '512x512/apps', '256x256/apps', '128x128/apps',
          '64x64/apps', '48x48/apps', '32x32/apps', '24x24/apps', '16x16/apps'
        ];
        for (const sub of subdirs) {
          for (const ext of exts) {
            if (fs.existsSync(path.join(themePath, sub, name + ext))) {
              return name;
            }
          }
        }
      }
    }

    // 3. Comprobar en otros temas instalados en los directorios base
    for (const base of baseDirs) {
      if (!fs.existsSync(base)) continue;
      try {
        const entries = fs.readdirSync(base, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const themePath = path.join(base, entry.name);
          const subdirs = ['apps/scalable', 'scalable/apps', 'apps', '512x512/apps', '256x256/apps', '48x48/apps'];
          for (const sub of subdirs) {
            for (const ext of exts) {
              if (fs.existsSync(path.join(themePath, sub, name + ext))) {
                return name;
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  return null;
}

function getSystemIconName(candidateNames) {
  if (resolvedSystemIcon !== undefined) return resolvedSystemIcon;
  resolvedSystemIcon = checkSystemIconAvailable(candidateNames);
  return resolvedSystemIcon;
}

// Ruta física al icono por defecto empaquetado con la aplicación
function getDefaultIconPath() {
  if (process.resourcesPath) {
    const unpackedIcon = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icon.png');
    if (fs.existsSync(unpackedIcon)) {
      return unpackedIcon;
    }
  }
  const devIcon = path.join(__dirname, '../assets/icon.png');
  if (fs.existsSync(devIcon) && !devIcon.includes('app.asar')) {
    return devIcon;
  }
  return path.join(__dirname, '../assets/icon.png');
}

function triggerDesktopNotification(title, body) {
  const notifTitle = title || 'Gmail';
  const notifBody = body || 'Nuevo correo recibido';
  const defaultIconPath = getDefaultIconPath();

  console.log('[NOTIF DISPARADA]:', notifTitle, notifBody);

  // 1. Notificación nativa de Electron (utiliza DBus / org.freedesktop.Notifications con soporte completo de icono y clic)
  if (Notification.isSupported()) {
    try {
      let iconOption;
      if (process.platform === 'linux') {
        const systemIcon = getSystemIconName(['gmail-desktop', 'gmail']);
        if (systemIcon) {
          // Si el tema de iconos del sistema tiene el icono disponible, usamos su nombre de tema para evitar el badge [i]
          iconOption = systemIcon;
        } else if (fs.existsSync(defaultIconPath)) {
          // Si no hay icono en el tema del sistema, usamos el icono por defecto de la aplicación
          const img = nativeImage.createFromPath(defaultIconPath);
          iconOption = img.isEmpty() ? defaultIconPath : img;
        } else {
          iconOption = defaultIconPath;
        }
      } else if (fs.existsSync(defaultIconPath)) {
        const img = nativeImage.createFromPath(defaultIconPath);
        iconOption = img.isEmpty() ? defaultIconPath : img;
      } else {
        iconOption = defaultIconPath;
      }

      const notif = new Notification({
        title: notifTitle,
        body: notifBody,
        icon: iconOption,
        silent: false
      });

      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
        if (gmailView) {
          gmailView.webContents.focus();
        }
      });

      notif.show();
      return;
    } catch (err) {
      console.error('Error al mostrar notificación nativa:', err);
    }
  }

  // 2. Fallback con notify-send para entornos Linux donde Notification.isSupported() falle
  if (process.platform === 'linux') {
    const { execFile } = require('child_process');
    const systemIcon = getSystemIconName(['gmail-desktop', 'gmail']);
    const notifIcon = systemIcon || defaultIconPath;
    execFile('notify-send', [
      '-a', 'gmail-desktop',
      '-i', notifIcon,
      '-h', 'string:desktop-entry:gmail-desktop',
      '-u', 'normal',
      notifTitle,
      notifBody
    ], (err) => {
      if (err) console.error('Error en notify-send fallback:', err);
    });
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
    icon: getDefaultIconPath(),
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

  // Crear la vista web para Gmail con sesión persistente y preload interceptor de notificaciones
  gmailView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'gmail-preload.js'),
      partition: 'persist:gmail',
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  mainWindow.contentView.addChildView(gmailView);

  // Sincronizar dimensiones iniciales de la vista
  updateViewBounds();
  setTimeout(updateViewBounds, 50);
  setTimeout(updateViewBounds, 250);

  // Permisos de notificaciones
  const session = gmailView.webContents.session;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(true);
    } else {
      callback(false);
    }
  });
  session.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'notifications';
  });

  // Limpiar UserAgent para compatibilidad de inicio de sesion de Google
  const defaultUA = gmailView.webContents.userAgent;
  const cleanUA = defaultUA.replace(/Electron\/[0-9\.]+\s?/, '').replace(/gmail-desktop\/[0-9\.]+\s?/, '');
  gmailView.webContents.setUserAgent(cleanUA);

  gmailView.webContents.loadURL(GMAIL_URL);

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

  // Links
  gmailView.webContents.setWindowOpenHandler(({ url }) => {
    if (isGoogleUrl(url)) {
      gmailView.webContents.loadURL(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  gmailView.webContents.on('will-navigate', (event, url) => {
    if (!isGoogleUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Title and unread notifications
  gmailView.webContents.on('page-title-updated', (_event, title) => {
    mainWindow.setTitle(title || 'Gmail');

    const match = title.match(/\(([\d,]+)\)/);
    const count = match ? parseInt(match[1].replace(',', ''), 10) : 0;

    mainWindow.webContents.send('update-unread', count);
    mainWindow.webContents.send('update-title', title);

    const now = Date.now();
    if (count > lastUnreadCount) {
      if (pendingTitleNotification) {
        clearTimeout(pendingTitleNotification);
        pendingTitleNotification = null;
      }

      // Si la ventana no está enfocada ni visible y no ha habido una notificación reciente
      if ((now - lastNotificationTime) > 4000 && (!mainWindow.isFocused() || !mainWindow.isVisible())) {
        const diff = count - lastUnreadCount;
        // Esperar 1.5 segundos para dar prioridad a la notificación rica (con remitente y asunto) de Gmail Web
        pendingTitleNotification = setTimeout(() => {
          pendingTitleNotification = null;
          if (Date.now() - lastNotificationTime > 4000) {
            const msg = diff > 1 ? `Tienes ${diff} nuevos correos en Gmail` : 'Tienes un nuevo correo en Gmail';
            lastNotificationTime = Date.now();
            triggerDesktopNotification('Gmail', msg);
          }
        }, 1500);
      }
    }
    lastUnreadCount = count;
  });

  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Window control IPC
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

ipcMain.on('window-resized', (_event, { width, height }) => {
  if (gmailView) {
    gmailView.setBounds({
      x: 0,
      y: TITLEBAR_HEIGHT,
      width: width,
      height: Math.max(0, height - TITLEBAR_HEIGHT)
    });
  }
});

// Manejador de notificaciones web enviadas por Gmail Web
ipcMain.on('gmail-notification', (_event, { title, options }) => {
  lastNotificationTime = Date.now();
  if (pendingTitleNotification) {
    clearTimeout(pendingTitleNotification);
    pendingTitleNotification = null;
  }
  const notifTitle = title || 'Gmail';
  const notifBody = (options && options.body) ? options.body : 'Nuevo correo recibido';
  triggerDesktopNotification(notifTitle, notifBody);
});

// Single instance lock
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
