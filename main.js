'use strict';
const {
  app, BrowserWindow, Tray, Menu,
  nativeImage, ipcMain, screen, shell,
} = require('electron');
const path = require('path');
const fs   = require('fs');

/* ── Single instance ──────────────────────────────────────────── */
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.idealbuilders.court-tracker');
app.disableHardwareAcceleration(); // lighter weight for a small utility

let tray      = null;
let win       = null;
let blurTimer = null;

/* ── Persistence ──────────────────────────────────────────────── */
const DATA_PATH = path.join(app.getPath('userData'), 'court-tracker.json');

function readData() {
  try {
    if (fs.existsSync(DATA_PATH)) return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (e) { console.error('read error', e); }
  return { version: 1, entries: [] };
}

function writeData(data) {
  try { fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8'); }
  catch (e) { console.error('write error', e); }
}

/* ── Window ───────────────────────────────────────────────────── */
function createWindow() {
  win = new BrowserWindow({
    width: 440, height: 560,
    show: false, frame: false, resizable: false, skipTaskbar: true,
    backgroundColor: '#1a1a1f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile('index.html');

  // Hide on blur with debounce to prevent race with tray click
  win.on('blur',  () => { blurTimer = setTimeout(() => { if (win && !win.isDestroyed()) win.hide(); }, 150); });
  win.on('focus', () => { clearTimeout(blurTimer); });
}

function positionWindow() {
  if (!tray || !win) return;
  const tb = tray.getBounds();
  const { width: ww, height: wh } = win.getBounds();
  const { workArea: wa } = screen.getDisplayNearestPoint({ x: tb.x, y: tb.y });

  // Place above tray on bottom taskbar; below on top taskbar
  const isBottom = (tb.y + tb.height) > (wa.y + wa.height * 0.75);
  let x = Math.round(tb.x + tb.width / 2 - ww / 2);
  let y = isBottom
    ? Math.round(tb.y - wh - 4)
    : Math.round(tb.y + tb.height + 4);

  x = Math.max(wa.x, Math.min(x, wa.x + wa.width  - ww));
  y = Math.max(wa.y, Math.min(y, wa.y + wa.height - wh));
  win.setPosition(x, y, false);
}

function toggleWindow() {
  clearTimeout(blurTimer);
  if (win.isVisible()) { win.hide(); }
  else { positionWindow(); win.show(); win.focus(); }
}

/* ── App ready ────────────────────────────────────────────────── */
app.whenReady().then(() => {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (!fs.existsSync(iconPath)) {
    try { require('./scripts/create-icon'); }
    catch (e) { console.warn('Icon generation failed:', e.message); }
  }

  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Court Tracker');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open',      click: () => { positionWindow(); win.show(); win.focus(); } },
    { type: 'separator' },
    { label: 'Quit',      click: () => app.quit() },
  ]));
  tray.on('click', toggleWindow);

  createWindow();

  ipcMain.handle('get-data',      ()      => readData());
  ipcMain.handle('save-data',     (_, d)  => { writeData(d); return true; });
  ipcMain.handle('hide-win',      ()      => { win.hide(); });
  ipcMain.handle('quit-app',      ()      => app.quit());
  ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
});

// Keep alive when all windows are closed — we live in the tray
app.on('window-all-closed', e => e.preventDefault());

// Second instance: focus the existing window instead of opening a new one
app.on('second-instance', () => {
  if (win) { positionWindow(); win.show(); win.focus(); }
});
