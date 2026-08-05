const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ----- Automatic disk backup system -----
// Stores full app data (products, contacts, transactions) as real files on disk,
// inside Electron's persistent userData folder, so data survives app
// reinstalls/updates even if localStorage gets wiped.
function getBackupsDir() {
  const dir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

ipcMain.handle('backup:write', async (_event, dataStr) => {
  try {
    const dir = getBackupsDir();

    // Always keep one up-to-date "latest" snapshot
    fs.writeFileSync(path.join(dir, 'latest.json'), dataStr, 'utf-8');

    // Also keep one dated snapshot per day, as extra safety net
    const today = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(dir, `backup-${today}.json`), dataStr, 'utf-8');

    // Prune dated snapshots older than 30 days to avoid unbounded growth
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.readdirSync(dir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
      .forEach((f) => {
        const datePart = f.replace('backup-', '').replace('.json', '');
        const t = new Date(datePart).getTime();
        if (!isNaN(t) && t < cutoff) {
          fs.unlinkSync(path.join(dir, f));
        }
      });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('backup:read-latest', async () => {
  try {
    const file = path.join(getBackupsDir(), 'latest.json');
    if (!fs.existsSync(file)) return { ok: false };
    return { ok: true, data: fs.readFileSync(file, 'utf-8') };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('backup:get-folder', async () => getBackupsDir());

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'سیستم حسابداری و انبارداری',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  // Remove menu bar for a clean desktop app view
  Menu.setApplicationMenu(null);

  // Load compiled index.html
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.log('Error loading local file, trying fallback server...', err);
    mainWindow.loadURL('http://localhost:3000');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
