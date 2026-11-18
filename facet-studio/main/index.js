'use strict';
// Facet — main process. Owns windows, the native menu bar, project files on disk and the Android toolchain.
// The renderer is sandboxed (contextIsolation + sandbox) and reaches these features only through preload.js.
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFile } = require('node:child_process');
const projects = require('./project.js');
const android = require('./android.js');

const isMac = process.platform === 'darwin';
const wins = new Map(); // webContents.id → { win, dir, project, mtimes, dirty, forceClose, pendingDir, run }
let pendingOpen = [];

app.setName('Facet');
app.setAboutPanelOptions({ applicationName: 'Facet', applicationVersion: app.getVersion(), credits: 'Design Jetpack Compose screens, wire them to your ViewModels and run them on Android.' });

/* ---------- small persisted stores ---------- */
const store = name => path.join(app.getPath('userData'), name);
const readJson = (name, fallback) => { try { return JSON.parse(fs.readFileSync(store(name), 'utf8')); } catch { return fallback; } };
const writeJson = (name, v) => { try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(store(name), JSON.stringify(v, null, 2)); } catch { /* not critical */ } };
const settings = () => ({ sdkPath: '', jdkPath: '', projectsDir: path.join(os.homedir(), 'AndroidStudioProjects'), ...readJson('settings.json', {}) });
function recents() { return readJson('recents.json', []).filter(r => fs.existsSync(path.join(r.dir, 'facet.json'))); }
function addRecent(dir, name) {
  const list = [{ dir, name }, ...recents().filter(r => r.dir !== dir)].slice(0, 12); writeJson('recents.json', list);
  app.addRecentDocument(path.join(dir, 'facet.json')); buildMenu();
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('recents', list));
}

/* ---------- windows ---------- */
const stateOf = w => wins.get(w.webContents.id);
const winOf = e => BrowserWindow.fromWebContents(e.sender);
function createWindow(dir) {
  const saved = readJson('window-state.json', null), offset = BrowserWindow.getAllWindows().length * 28;
  const win = new BrowserWindow({
    width: saved?.width || 1480, height: saved?.height || 920, x: saved ? saved.x + offset : undefined, y: saved ? saved.y + offset : undefined,
    minWidth: 1024, minHeight: 680, show: false, title: 'Facet', titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0C0E12' : '#E6E8EE',
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  const id = win.webContents.id;
  wins.set(id, { win, dir: null, project: null, mtimes: {}, dirty: false, forceClose: false, pendingDir: dir || null, run: null });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('fullscreen', false));
  win.on('close', e => {
    const s = wins.get(id); writeJson('window-state.json', win.getNormalBounds());
    if (!s || !s.dirty || s.forceClose) { stopRun(s); return; }
    e.preventDefault();
    const choice = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Save', 'Don’t Save', 'Cancel'], defaultId: 0, cancelId: 2, message: `Do you want to save the changes you made to “${s.project?.app?.name || 'this project'}”?`, detail: 'Your changes will be lost if you don’t save them.' });
    if (choice === 0) win.webContents.send('menu', 'save-and-close');
    else if (choice === 1) { s.forceClose = true; win.close(); }
  });
  win.on('closed', () => { stopRun(wins.get(id)); wins.delete(id); buildMenu(); });
  win.on('focus', buildMenu);
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('https://')) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  return win;
}
async function sendWelcome(win) { const s = stateOf(win); s.dir = null; s.project = null; win.setTitle('Welcome to Facet'); if (isMac) win.setRepresentedFilename(''); win.webContents.send('welcome', { recents: recents(), status: await android.status(settings()) }); }
async function openInto(win, dir) {
  try {
    const { project, sources, mtimes } = await projects.openProject(dir);
    const s = stateOf(win); Object.assign(s, { dir, project, mtimes, dirty: false });
    win.setTitle(project.app.name); if (isMac) win.setRepresentedFilename(dir);
    win.webContents.send('load-project', { project, sources, dir });
    addRecent(dir, project.app.name); buildMenu();
  } catch (err) {
    dialog.showErrorBox('Couldn’t open the project', `${dir}\n\n${err.message}`);
    if (!stateOf(win)?.project) sendWelcome(win);
  }
}
function openPath(p, from) {
  const dir = projects.resolveProjectDir(p);
  if (!dir) { dialog.showErrorBox('Not a Facet project', `${p}\n\nChoose a folder that contains facet.json, or create a new project.`); return; }
  for (const s of wins.values()) if (s.dir === dir) { s.win.show(); s.win.focus(); return; }
  const target = from && !stateOf(from)?.project ? from : null;
  if (target) openInto(target, dir); else createWindow(dir);
}
async function showOpenDialog(from) {
  const r = await dialog.showOpenDialog(from || undefined, { title: 'Open a Facet project', buttonLabel: 'Open', properties: ['openDirectory', 'openFile'], filters: [{ name: 'Facet project', extensions: ['json'] }] });
  if (!r.canceled && r.filePaths[0]) openPath(r.filePaths[0], from);
}

/* ---------- IPC ---------- */
ipcMain.on('ready', async e => { const w = winOf(e), s = w && stateOf(w); if (!s) return; if (s.pendingDir) { const d = s.pendingDir; s.pendingDir = null; await openInto(w, d); } else if (s.project) w.webContents.send('load-project', { project: s.project, sources: (await projects.openProject(s.dir)).sources, dir: s.dir }); else sendWelcome(w); w.webContents.send('fullscreen', w.isFullScreen()); });
ipcMain.on('set-dirty', (e, v) => { const w = winOf(e), s = w && stateOf(w); if (!s) return; s.dirty = !!v; if (isMac) w.setDocumentEdited(!!v); });
ipcMain.on('close-window', e => { const w = winOf(e), s = w && stateOf(w); if (!s) return; s.forceClose = true; w.close(); });
ipcMain.handle('defaults', () => ({ projectsDir: settings().projectsDir }));
ipcMain.handle('pick-folder', async (e, o = {}) => { const r = await dialog.showOpenDialog(winOf(e), { title: o.title || 'Choose a folder', defaultPath: o.defaultPath || undefined, properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('create-project', async (e, o) => {
  const w = winOf(e);
  try {
    if (!o || typeof o.parent !== 'string' || !path.isAbsolute(o.parent)) throw new Error('Choose a folder to save the project in.');
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(o.folder || '')) throw new Error('The project folder name is invalid.');
    const dir = path.join(o.parent, o.folder);
    await projects.createProject(dir, { template: o.template === 'sample' ? 'sample' : 'blank', name: o.name, packageName: o.packageName });
    const s = settings(); if (s.projectsDir !== o.parent) writeJson('settings.json', { ...readJson('settings.json', {}), projectsDir: o.parent });
    if (stateOf(w)?.project) createWindow(dir); else await openInto(w, dir);
    return { ok: true, dir };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.on('open-dialog', e => showOpenDialog(winOf(e)));
ipcMain.on('open-path', (e, dir) => typeof dir === 'string' && openPath(dir, winOf(e)));
ipcMain.handle('forget-recent', (e, dir) => { const list = recents().filter(r => r.dir !== dir); writeJson('recents.json', list); buildMenu(); return list; });
ipcMain.handle('save-project', async (e, payload) => {
  const w = winOf(e), s = w && stateOf(w); if (!s?.dir) return { ok: false, error: 'No project folder is open.' };
  try {
    const r = await projects.saveProject(s.dir, payload?.project, payload?.sources);
    s.project = payload.project; s.mtimes = r.mtimes; w.setTitle(s.project.app.name); addRecent(s.dir, s.project.app.name);
    return { ok: true, removed: r.removed };
  } catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('check-external', async e => {
  const w = winOf(e), s = w && stateOf(w); if (!s?.project) return {};
  const changed = {};
  for (const [id, vm] of Object.entries(s.project.viewModels)) {
    try { const abs = projects.inside(s.dir, vm.file), st = fs.statSync(abs); if (s.mtimes[id] && st.mtimeMs > s.mtimes[id] + 1) { changed[id] = fs.readFileSync(abs, 'utf8'); s.mtimes[id] = st.mtimeMs; } } catch { /* missing file */ }
  }
  return changed;
});
ipcMain.on('reveal', e => { const s = stateOf(winOf(e)); if (s?.dir) shell.showItemInFolder(path.join(s.dir, 'facet.json')); });
ipcMain.handle('open-in-studio', e => new Promise(resolve => {
  const s = stateOf(winOf(e)); if (!s?.dir) return resolve({ ok: false, error: 'No project is open.' });
  if (!isMac) return shell.openPath(s.dir).then(err => resolve({ ok: !err, error: err }));
  execFile('open', ['-a', 'Android Studio', s.dir], err => resolve(err ? { ok: false, error: 'Android Studio isn’t installed in Applications.' } : { ok: true }));
}));
ipcMain.handle('get-settings', () => settings());
ipcMain.handle('set-settings', (e, next) => { const clean = {}; ['sdkPath', 'jdkPath', 'projectsDir'].forEach(k => { if (typeof next?.[k] === 'string') clean[k] = next[k]; }); writeJson('settings.json', { ...readJson('settings.json', {}), ...clean }); return settings(); });
ipcMain.handle('tool-status', () => android.status(settings()));
ipcMain.handle('devices', async () => android.listDevices(android.findSdk(settings())));
ipcMain.on('run', (e, o) => { const w = winOf(e); if (w) runOnDevice(w, String(o?.target || 'apk')); });
ipcMain.on('stop', e => stopRun(stateOf(winOf(e)), true));

/* ---------- run pipeline: boot → gradle → install → launch → logcat ---------- */
function stopRun(s, user) {
  if (!s?.run) return; const r = s.run; r.ac.abort();
  if (r.serial && r.sdk && r.pkg && user) android.forceStop(r.sdk, r.serial, r.pkg);
}
async function runOnDevice(win, target) {
  const s = stateOf(win); if (!s?.dir || s.run) return;
  const ac = new AbortController(); s.run = { ac };
  const send = ev => { if (!win.isDestroyed()) win.webContents.send('run', ev); };
  const line = (text, kind = '') => send({ type: 'line', text, kind });
  try {
    const tools = await android.status(settings());
    if (!tools.sdk || !tools.jdk) throw new Error(tools.problems.join(' '));
    android.ensureLocalProperties(s.dir, tools.sdk);
    let serial = null;
    if (target.startsWith('avd:')) { send({ type: 'phase', phase: 'booting' }); serial = await android.bootAvd(tools.sdk, target.slice(4), t => line(t, 'task'), ac.signal); }
    else if (target.startsWith('dev:')) serial = target.slice(4);
    send({ type: 'phase', phase: 'building' });
    const task = serial ? ':app:installDebug' : ':app:assembleDebug';
    line(`$ ./gradlew ${task}   · JDK ${tools.javaVersion} · ${tools.sdk}${serial ? ` · device ${serial}` : ''}`, 'task');
    let installing = false, errors = 0;
    const r = await android.runGradle(s.dir, [task], { JAVA_HOME: tools.jdk, ANDROID_HOME: tools.sdk, ANDROID_SDK_ROOT: tools.sdk, ...(serial ? { ANDROID_SERIAL: serial } : {}) }, l => {
      if (!l) return;
      const p = android.parseBuildLine(l, s.dir); if (p) { if (p.sev === 'error') errors++; send({ type: 'problem', problem: p }); }
      if (!installing && serial && /> Task :app:installDebug/.test(l)) { installing = true; send({ type: 'phase', phase: 'installing' }); }
      line(l, p ? (p.sev === 'error' ? 'err' : 'warn') : /^> Task /.test(l) ? 'task' : /BUILD SUCCESSFUL/.test(l) ? 'ok' : /BUILD FAILED|^FAILURE:|^\* What went wrong/.test(l) ? 'err' : '');
    }, ac.signal);
    if (r.code === -2) { send({ type: 'done', ok: false, error: 'Stopped' }); return; }
    if (r.code !== 0) { send({ type: 'done', ok: false, error: r.error || (errors ? `Build failed with ${errors} error${errors > 1 ? 's' : ''}` : 'Build failed. See the Build tab.') }); return; }
    if (!serial) { send({ type: 'done', ok: true, apk: path.join(s.dir, 'app/build/outputs/apk/debug/app-debug.apk') }); return; }
    send({ type: 'phase', phase: 'launching' });
    const pkg = s.project.app.packageName, l = await android.launch(tools.sdk, serial, pkg);
    if (!l.ok || /Error:/.test(l.stdout + l.stderr)) throw new Error(`Installed, but the app didn’t launch: ${(l.stderr || l.stdout).trim()}`);
    Object.assign(s.run, { serial, pkg, sdk: tools.sdk });
    line(`Launched ${pkg} on ${serial}`, 'ok');
    send({ type: 'done', ok: true, running: true });
    await android.logcat(tools.sdk, serial, pkg, entry => send({ type: 'logcat', entry }), ac.signal);
    send({ type: 'phase', phase: 'stopped' }); line('App stopped', 'task');
  } catch (err) {
    send({ type: 'done', ok: false, error: err.message }); line(err.message, 'err');
  } finally { s.run = null; }
}

/* ---------- native menu bar ---------- */
function send(cmd, arg) { const w = BrowserWindow.getFocusedWindow(); if (w) w.webContents.send('menu', cmd, arg); }
function buildMenu() {
  const hasProject = !!(BrowserWindow.getFocusedWindow() && stateOf(BrowserWindow.getFocusedWindow())?.project);
  const P = item => ({ ...item, enabled: hasProject });
  const insertItems = [['Column', 'Column'], ['Row', 'Row'], ['Box', 'Box'], ['Card', 'Card'], null, ['Text', 'Text'], ['Button', 'Button'], ['IconButton', 'Icon Button'], ['Image', 'Image'], null, ['TextField', 'Text Field'], ['Switch', 'Switch'], ['Divider', 'Divider'], ['Spacer', 'Spacer']]
    .map(x => x ? P({ label: x[1], click: () => send('insert', x[0]) }) : { type: 'separator' });
  const rec = recents();
  const template = [
    ...(isMac ? [{ label: 'Facet', submenu: [{ role: 'about' }, { type: 'separator' }, { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => send('settings') }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'File', submenu: [
      { label: 'New Project…', accelerator: 'CmdOrCtrl+N', click: () => { const w = BrowserWindow.getFocusedWindow(); if (w) send('new'); else createWindow(); } },
      { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => showOpenDialog(BrowserWindow.getFocusedWindow()) },
      { label: 'Open Recent', submenu: rec.length ? [...rec.map(r => ({ label: `${r.name} — ${r.dir.replace(os.homedir(), '~')}`, click: () => openPath(r.dir, BrowserWindow.getFocusedWindow()) })), { type: 'separator' }, { label: 'Clear Menu', click: () => { writeJson('recents.json', []); app.clearRecentDocuments(); buildMenu(); } }] : [{ label: 'No recent projects', enabled: false }] },
      { type: 'separator' },
      P({ label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') }),
      { type: 'separator' },
      P({ label: 'Show in Finder', click: () => send('reveal') }),
      P({ label: 'Open in Android Studio', click: () => send('studio') }),
      { type: 'separator' }, { role: 'close' },
    ] },
    { label: 'Edit', submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('redo') },
      { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }, { type: 'separator' },
      P({ label: 'Duplicate Layer', accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') }),
      P({ label: 'Delete Layer', click: () => send('delete') }),
      { type: 'separator' }, { label: 'Insert', submenu: insertItems },
    ] },
    { label: 'View', submenu: [
      P({ label: 'Design', accelerator: 'CmdOrCtrl+1', click: () => send('mode-design') }),
      P({ label: 'Split', accelerator: 'CmdOrCtrl+2', click: () => send('mode-split') }),
      P({ label: 'Code', accelerator: 'CmdOrCtrl+3', click: () => send('mode-code') }),
      P({ label: 'Navigation Flow', accelerator: 'CmdOrCtrl+4', click: () => send('flow') }),
      { type: 'separator' },
      P({ label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('zoom-in') }),
      P({ label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('zoom-out') }),
      P({ label: 'Zoom to Fit', accelerator: 'CmdOrCtrl+0', click: () => send('zoom-fit') }),
      { type: 'separator' },
      P({ label: 'Preview App in Dark Scheme', accelerator: 'Shift+CmdOrCtrl+L', click: () => send('toggle-dark') }),
      { type: 'separator' }, { role: 'togglefullscreen' },
      { label: 'Developer', submenu: [{ label: 'Reload Window', click: () => BrowserWindow.getFocusedWindow()?.webContents.reload() }, { role: 'toggleDevTools' }] },
    ] },
    { label: 'Project', submenu: [
      P({ label: 'New Screen…', accelerator: 'Shift+CmdOrCtrl+N', click: () => send('new-screen') }),
      P({ label: 'New ViewModel…', accelerator: 'Alt+CmdOrCtrl+N', click: () => send('new-vm') }),
      { type: 'separator' },
      P({ label: 'Next Screen', accelerator: 'Alt+CmdOrCtrl+Right', click: () => send('screen-next', 1) }),
      P({ label: 'Previous Screen', accelerator: 'Alt+CmdOrCtrl+Left', click: () => send('screen-next', -1) }),
    ] },
    { label: 'Run', submenu: [
      P({ label: 'Run on Device', accelerator: 'CmdOrCtrl+R', click: () => send('run') }),
      P({ label: 'Stop', accelerator: 'CmdOrCtrl+.', click: () => send('stop') }),
      { type: 'separator' },
      P({ label: 'Play Prototype', accelerator: 'CmdOrCtrl+Enter', click: () => send('play') }),
    ] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => send('shortcuts') },
      { type: 'separator' },
      { label: 'Jetpack Compose Documentation', click: () => shell.openExternal('https://developer.android.com/develop/ui/compose/documentation') },
      { label: 'Run Apps on a Hardware Device', click: () => shell.openExternal('https://developer.android.com/studio/run/device') },
      { label: 'Create and Manage Virtual Devices', click: () => shell.openExternal('https://developer.android.com/studio/run/managing-avds') },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ---------- lifecycle ---------- */
app.on('open-file', (e, p) => { e.preventDefault(); if (app.isReady()) openPath(p, BrowserWindow.getFocusedWindow()); else pendingOpen.push(p); });
app.whenReady().then(() => {
  buildMenu();
  const args = process.argv.slice(1).filter(a => !a.startsWith('-') && projects.resolveProjectDir(path.resolve(a)));
  const toOpen = [...pendingOpen, ...args.map(a => path.resolve(a))]; pendingOpen = [];
  if (toOpen.length) toOpen.forEach(p => createWindow(projects.resolveProjectDir(p))); else createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('before-quit', () => wins.forEach(s => stopRun(s)));
app.on('window-all-closed', () => { if (!isMac) app.quit(); });
