'use strict';
/* Facet editor — shared state and helpers. Scripts in src/app share one global scope and load in order. */
const C = window.FacetCore;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- icons ---------- */
const MI = {
  Add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  ArrowBack: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  Check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  ChevronRight: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  Close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  Delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  Edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  Favorite: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  FavoriteBorder: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
  Home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  Menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  MoreVert: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  Notifications: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  Person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  Remove: 'M19 13H5v-2h14v2z',
  Search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  Settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  Share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
  ShoppingBag: 'M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z',
  Star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
};
const mi = (n, s = 24) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="currentColor" d="${MI[n] || MI.Star}"/></svg>`;
const UIP = {
  column: '<rect x="4" y="4" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="16" width="16" height="4" rx="1"/>',
  row: '<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
  box: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h7M7 14h4"/>',
  text: '<path d="M5 6V5h14v1M12 5v14M9 19h6"/>',
  button: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/>',
  iconbtn: '<circle cx="12" cy="12" r="8"/><path d="M12 9v6M9 12h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  spacer: '<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
  field: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10v4"/>',
  toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
  divider: '<path d="M3 12h18"/><path d="M6 7h12M6 17h12" opacity=".4"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>', play: '<path d="M7 5v14l12-7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  cursor: '<path d="M5 3l14 7-6 2-2 6z"/>', code: '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', flow: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 4 4v5.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 2-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', motion: '<path d="M3 17c4 0 5-10 9-10s5 10 9 10"/>', warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M18 13l-6 6-6-6"/>', gap: '<path d="M4 4v16M20 4v16M9 12h6"/>',
  props: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  hammer: '<path d="M15 12l-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 15L22 10.6 13.4 2 9 6.4l2 2"/>',
  box3d: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  check: '<path d="M5 12l5 5L20 7"/>', file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
};
const ui = (n, s = 16) => `<svg class="u" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UIP[n] || ''}</svg>`;
const TYPEICON = { Column: 'column', Row: 'row', Box: 'box', Card: 'card', Text: 'text', Button: 'button', IconButton: 'iconbtn', Image: 'image', Spacer: 'spacer', List: 'list', TextField: 'field', Switch: 'toggle', Divider: 'divider' };
const TYPELABEL = { List: 'LazyColumn', TextField: 'OutlinedTextField', Divider: 'HorizontalDivider' };

/* ---------- vocabulary ---------- */
const FILL_TOKENS = ['surface', 'surfaceContainer', 'primary', 'primaryContainer', 'secondaryContainer', 'error'];
const TEXT_TOKENS = ['onSurface', 'onSurfaceVariant', 'primary', 'onPrimary', 'onPrimaryContainer', 'onSecondaryContainer', 'error'];
const DISPLAY_FONTS = ['Fraunces', 'Space Grotesk', 'Outfit', 'DM Sans', 'Inter'];
const BODY_FONTS = ['DM Sans', 'Inter', 'Outfit', 'Space Grotesk'];
const DEVICES = { compact: { w: 360, h: 760, label: 'Compact · 360 dp' }, medium: { w: 412, h: 860, label: 'Pixel · 412 dp' } };
const EASE_CSS = { Emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)', Standard: 'cubic-bezier(0.4, 0, 0.2, 1)', Linear: 'linear', Spring: 'cubic-bezier(0.34, 1.45, 0.64, 1)' };

/* ---------- project state ---------- */
let project = null;      // facet.json contents
let sources = {};        // viewModel id → Kotlin source
let models = {};         // viewModel id → parsed model
let projectDir = null;   // folder on disk (desktop)
let dirty = false;
let uid = 0;
const st = { screen: null, sel: null, inst: 0, hover: null, tool: 'design', view: 'screen', zoom: 'fit', z: 1, device: 'compact', file: null, leftTab: 'layers',
  collapsed: new Set(), mode: 'split', mtab: 'canvas', ctab: 'log', previewVm: null };
let navStack = [], animating = false, problems = [], buildProblems = [], logs = [], scopes = {}, scopeSeq = 0, flashVm = -1;
const undoStack = [], redoStack = []; let lastKey = null, lastT = 0;

const N = (type, name, props = {}, children) => { const n = { id: 'n' + (++uid), type, name: name || type, props }; if (C.CONTAINERS.has(type)) n.children = children || []; return n; };
const order = () => project.order;
const scr = (k = st.screen) => project.screens[k];
const info = (k = st.screen) => C.screenInfo(project, k);
const modelOf = k => models[project.screens[k]?.viewModel];
const curModel = () => modelOf(st.screen);
function find(id) { return project ? C.findNode(project, id) : null; }
function pathTo(id) { return C.pathTo(project, id); }
const selNode = () => find(st.sel)?.node;
function varsFor(id) { const f = find(id); return f ? C.varsFor(project, id, modelOf(f.screen)) : {}; }
function typeOf(path, vars, k = st.screen) { return C.typeOf(path, vars, modelOf(k)); }
function reparse() { models = C.modelsFor(project, sources); }
function previewOf(k = st.screen) { return project.preview?.[project.screens[k].viewModel] || {}; }
function cloneNode(n) { const c = JSON.parse(JSON.stringify(n)); C.walk(c, x => { x.id = 'n' + (++uid); }); return c; }
function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) t = (t[k[i]] ??= {}); if (v === undefined || v === null) delete t[k[k.length - 1]]; else t[k[k.length - 1]] = v; }
function resolve(path, scope) { const s = String(path).split('.'); let v = scope[s[0]]; for (let i = 1; i < s.length && v != null; i++) v = v[s[i]]; return v; }
function fmt(str, scope) { return String(str ?? '').replace(/\{([\w.]+)\}/g, (_, p) => { const v = resolve(p, scope); return v == null ? '' : String(v); }); }
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------- undo / mutate ---------- */
const snap = () => JSON.stringify(project);
function mutate(fn, key, opts = {}) {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastT < 1500)) { undoStack.push(snap()); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; }
  lastKey = key; lastT = now; fn(); if (opts.reparse) reparse(); refresh(opts); markDirty();
}
function restore(s) {
  project = JSON.parse(s); Object.keys(sources).forEach(id => { if (!project.viewModels[id]) delete sources[id]; });
  Object.keys(project.viewModels).forEach(id => { if (sources[id] == null) sources[id] = ''; });
  reparse(); if (!project.screens[st.screen]) st.screen = project.order[0]; if (!find(st.sel)) st.sel = null; lastKey = null; refresh(); markDirty();
}
function doUndo() { if (!undoStack.length) return toast('Nothing to undo'); redoStack.push(snap()); restore(undoStack.pop()); toast('Undo'); }
function doRedo() { if (!redoStack.length) return toast('Nothing to redo'); undoStack.push(snap()); restore(redoStack.pop()); toast('Redo'); }

/* ---------- element refs ---------- */
const appEl = $('#app'), viewport = $('#viewport'), stage = $('#stage'), ov = $('#ov'), treeEl = $('#tree'), inspEl = $('#insp'), codeView = $('#codeView'),
  vmEd = $('#vmEd'), vmPre = $('#vmPre'), vmGut = $('#vmGut'), vmTa = $('#vmTa'), vmScroll = $('#vmScroll'), conBody = $('#conBody');

/* ---------- theme ---------- */
$('#typeCss').textContent = Object.entries(C.TYPE).map(([k, v]) => `.ts-${k}{font-family:var(--m-${v.role});font-size:${v.size}px;line-height:${v.lh}px;font-weight:${v.w};letter-spacing:${v.role === 'display' ? '-0.01em' : k.startsWith('label') ? '0.01em' : '0'}}`).join('');
function applyTheme() {
  if (!project) return; const t = project.theme, pal = t[t.mode];
  C.COLOR_KEYS.forEach(k => appEl.style.setProperty('--m-' + k, pal[k]));
  appEl.style.setProperty('--m-display', C.FONTS[t.display]?.css || 'serif'); appEl.style.setProperty('--m-body', C.FONTS[t.body]?.css || 'sans-serif');
}
