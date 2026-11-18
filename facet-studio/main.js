'use strict';
// Facet — main process. Owns windows, the native macOS menu bar, and all file system access.
// The renderer is sandboxed (contextIsolation + sandbox) and reaches these features only through preload.js.
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');

const isMac = process.platform === 'darwin';
const SAMPLE_TITLE = 'Brew (sample)';
const docs = new Map(); // webContents.id -> { filePath, dirty, forceClose }
let pendingOpen = [];   // files passed by Finder before the app was ready

app.setName('Facet');
app.setAboutPanelOptions({
  applicationName: 'Facet',
  applicationVersion: app.getVersion(),
  credits: 'Design Jetpack Compose screens visually and wire them to your Kotlin ViewModels.',
});

/* ---------- window state ---------- */
const statePath = () => path.join(app.getPath('userData'), 'window-state.json');
function readBounds() { try { return JSON.parse(fsSync.readFileSync(statePath(), 'utf8')); } catch { return null; } }
function writeBounds(win) { try { fsSync.writeFileSync(statePath(), JSON.stringify(win.getNormalBounds())); } catch { /* not critical */ } }

function stateOf(win) { return docs.get(win.webContents.id); }
function setFile(win, filePath) {
  const s = stateOf(win); s.filePath = filePath;
  const name = filePath ? path.basename(filePath) : null;
  win.setTitle(name || SAMPLE_TITLE);
  if (isMac) win.setRepresentedFilename(filePath || '');
  win.webContents.send('file', name);
}

function createWindow(filePath) {
  const saved = readBounds();
  const offset = BrowserWindow.getAllWindows().length * 28;
  const win = new BrowserWindow({
    width: saved?.width || 1480,
    height: saved?.height || 920,
    x: saved ? saved.x + offset : undefined,
    y: saved ? saved.y + offset : undefined,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: SAMPLE_TITLE,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0C0E12' : '#E6E8EE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  const id = win.webContents.id;
  docs.set(id, { filePath: null, dirty: false, forceClose: false });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.once('did-finish-load', () => {
    if (filePath) loadInto(win, filePath); else setFile(win, null);
    win.webContents.send('fullscreen', win.isFullScreen());
  });
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen', false));

  win.on('close', e => {
    const s = docs.get(id); writeBounds(win);
    if (!s || !s.dirty || s.forceClose) return;
    e.preventDefault();
    const name = s.filePath ? path.basename(s.filePath) : SAMPLE_TITLE;
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning', buttons: ['Save', 'Don’t Save', 'Cancel'], defaultId: 0, cancelId: 2,
      message: `Do you want to save the changes you made to “${name}”?`,
      detail: 'Your changes will be lost if you don’t save them.',
    });
    if (choice === 0) win.webContents.send('menu', 'save-and-close');
    else if (choice === 1) { s.forceClose = true; win.close(); }
  });
  win.on('closed', () => docs.delete(id));

  // Security: never navigate away from the app or open new windows; send https links to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  return win;
}

/* ---------- open / save / export ---------- */
async function loadInto(win, filePath) {
  try {
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (data?.format !== 'facet-project') throw new Error('This file is not a Facet project.');
    win.webContents.send('load-project', data, path.basename(filePath));
    setFile(win, filePath);
    app.addRecentDocument(filePath);
  } catch (err) {
    dialog.showErrorBox('Couldn’t open the project', `${path.basename(filePath)}: ${err.message}`);
  }
}
function openFile(filePath) {
  const existing = [...docs.entries()].find(([, s]) => s.filePath === filePath);
  if (existing) { const w = BrowserWindow.getAllWindows().find(x => x.webContents.id === existing[0]); if (w) { w.show(); w.focus(); return; } }
  const focused = BrowserWindow.getFocusedWindow();
  const s = focused && stateOf(focused);
  if (focused && s && !s.filePath && !s.dirty) loadInto(focused, filePath);
  else createWindow(filePath);
}
async function showOpenDialog() {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || undefined, {
    title: 'Open Facet project', properties: ['openFile'], filters: [{ name: 'Facet Project', extensions: ['facet'] }],
  });
  if (!r.canceled && r.filePaths[0]) openFile(r.filePaths[0]);
}

const winOf = e => BrowserWindow.fromWebContents(e.sender);
ipcMain.on('set-dirty', (e, dirty) => { const w = winOf(e); const s = w && stateOf(w); if (!s) return; s.dirty = !!dirty; if (isMac) w.setDocumentEdited(!!dirty); });
ipcMain.on('close-window', e => { const w = winOf(e); const s = w && stateOf(w); if (!s) return; s.forceClose = true; w.close(); });

ipcMain.handle('save-project', async (e, json, saveAs) => {
  const w = winOf(e); const s = w && stateOf(w); if (!s) return { ok: false };
  if (typeof json !== 'string' || json.length > 50 * 1024 * 1024) return { ok: false, error: 'Project data is invalid.' };
  try { if (JSON.parse(json)?.format !== 'facet-project') throw new Error(); } catch { return { ok: false, error: 'Project data is invalid.' }; }
  let target = s.filePath;
  if (!target || saveAs) {
    const r = await dialog.showSaveDialog(w, {
      title: saveAs ? 'Save a copy' : 'Save project',
      defaultPath: s.filePath || path.join(app.getPath('documents'), 'Brew.facet'),
      filters: [{ name: 'Facet Project', extensions: ['facet'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false };
    target = r.filePath.endsWith('.facet') ? r.filePath : r.filePath + '.facet';
  }
  try {
    await fs.writeFile(target, json, 'utf8');
    app.addRecentDocument(target); setFile(w, target);
    return { ok: true, name: path.basename(target) };
  } catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('export-kotlin', async (e, files) => {
  const w = winOf(e); if (!w) return { ok: false };
  if (!files || typeof files !== 'object') return { ok: false, error: 'Nothing to export.' };
  const entries = Object.entries(files);
  const safe = entries.every(([rel, body]) => typeof rel === 'string' && typeof body === 'string' && /^[\w./-]+\.kt$/.test(rel) && !rel.split('/').includes('..') && !path.isAbsolute(rel));
  if (!safe || !entries.length) return { ok: false, error: 'Refused an unsafe file path.' };
  const r = await dialog.showOpenDialog(w, {
    title: 'Export Kotlin sources', message: 'Choose your Android project folder (the one that contains app/).',
    buttonLabel: 'Export', properties: ['openDirectory', 'createDirectory'],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  const root = r.filePaths[0];
  try {
    for (const [rel, body] of entries) {
      const dest = path.resolve(root, rel);
      if (!dest.startsWith(root + path.sep)) throw new Error('Refused a path outside the folder.');
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, body, 'utf8');
    }
    shell.showItemInFolder(path.resolve(root, entries[0][0]));
    return { ok: true, count: entries.length, dir: root };
  } catch (err) { return { ok: false, error: err.message }; }
});

/* ---------- native menu bar ---------- */
function send(cmd, arg) { const w = BrowserWindow.getFocusedWindow(); if (w) w.webContents.send('menu', cmd, arg); }
function buildMenu() {
  const insertItems = [['Column', 'Column'], ['Row', 'Row'], ['Box', 'Box'], ['Card', 'Card'], null, ['Text', 'Text'], ['Button', 'Button'], ['IconButton', 'Icon Button'], ['Image', 'Image'], ['Spacer', 'Spacer']]
    .map(x => x ? { label: x[1], click: () => send('insert', x[0]) } : { type: 'separator' });
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
      { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: showOpenDialog },
      ...(isMac ? [{ role: 'recentDocuments', submenu: [{ role: 'clearRecentDocuments' }] }] : []),
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
      { label: 'Save As…', accelerator: 'Shift+CmdOrCtrl+S', click: () => send('save-as') },
      { type: 'separator' },
      { label: 'Export Kotlin Sources…', accelerator: 'Shift+CmdOrCtrl+E', click: () => send('export') },
      { type: 'separator' },
      { role: 'close' },
    ] },
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('redo') },
      { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      { type: 'separator' },
      { label: 'Duplicate Layer', accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') },
      { label: 'Delete Layer', click: () => send('delete') },
      { type: 'separator' },
      { label: 'Insert', submenu: insertItems },
    ] },
    { label: 'View', submenu: [
      { label: 'Design', accelerator: 'CmdOrCtrl+1', click: () => send('mode-design') },
      { label: 'Split', accelerator: 'CmdOrCtrl+2', click: () => send('mode-split') },
      { label: 'Code', accelerator: 'CmdOrCtrl+3', click: () => send('mode-code') },
      { label: 'Navigation Flow', accelerator: 'CmdOrCtrl+4', click: () => send('flow') },
      { type: 'separator' },
      { label: 'Screen', submenu: [['home', 'Home'], ['detail', 'Detail'], ['cart', 'Cart']].map(([k, l]) => ({ label: l, click: () => send('screen', k) })) },
      { type: 'separator' },
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('zoom-in') },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('zoom-out') },
      { label: 'Zoom to Fit', accelerator: 'CmdOrCtrl+0', click: () => send('zoom-fit') },
      { type: 'separator' },
      { label: 'Preview App in Dark Scheme', accelerator: 'Shift+CmdOrCtrl+L', click: () => send('toggle-dark') },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { label: 'Developer', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] },
    ] },
    { label: 'Prototype', submenu: [
      { label: 'Play / Stop', accelerator: 'CmdOrCtrl+Enter', click: () => send('play') },
      { label: 'Reset State', accelerator: 'Shift+CmdOrCtrl+R', click: () => send('reset-state') },
    ] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => send('shortcuts') },
      { type: 'separator' },
      { label: 'Jetpack Compose Documentation', click: () => shell.openExternal('https://developer.android.com/develop/ui/compose/documentation') },
      { label: 'Material 3 for Compose', click: () => shell.openExternal('https://developer.android.com/develop/ui/compose/designsystems/material3') },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- lifecycle ---------- */
app.on('open-file', (e, filePath) => { e.preventDefault(); if (app.isReady()) openFile(filePath); else pendingOpen.push(filePath); });
app.whenReady().then(() => {
  buildMenu();
  const fromArgs = process.argv.slice(1).filter(a => a.endsWith('.facet') && fsSync.existsSync(a));
  const toOpen = [...pendingOpen, ...fromArgs]; pendingOpen = [];
  if (toOpen.length) toOpen.forEach(f => createWindow(f)); else createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
