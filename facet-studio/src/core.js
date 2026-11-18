/*
 * Facet core — shared by the editor (renderer) and the main process.
 * Pure functions only: project model helpers, Kotlin ViewModel parsing, Kotlin code generation
 * and the Android project template. No DOM, no Node APIs.
 */
(function (root) {
'use strict';

/* ---------- versions of the generated Android project (verified to build together) ---------- */
const VERSIONS = {
  gradle: '8.14.3', agp: '8.13.2', kotlin: '2.2.21', composeBom: '2025.12.01', iconsExtended: '1.7.8',
  coreKtx: '1.17.0', activityCompose: '1.11.0', lifecycle: '2.9.4', navigation: '2.9.8',
  serialization: '1.9.0', coil: '3.3.0', compileSdk: 36, targetSdk: 36, minSdk: 26,
};

/* ---------- design vocabulary ---------- */
const CONTAINERS = new Set(['Column', 'Row', 'Box', 'Card', 'List']);
const COLOR_KEYS = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondaryContainer', 'onSecondaryContainer', 'surface', 'surfaceContainer', 'onSurface', 'onSurfaceVariant', 'outline', 'error', 'onError'];
const ON = { primary: 'onPrimary', primaryContainer: 'onPrimaryContainer', secondaryContainer: 'onSecondaryContainer', surface: 'onSurface', surfaceContainer: 'onSurface', error: 'onError' };
const TYPE = {
  displaySmall: { size: 36, lh: 44, w: 400, role: 'display' },
  headlineMedium: { size: 28, lh: 36, w: 500, role: 'display' },
  headlineSmall: { size: 24, lh: 32, w: 500, role: 'display' },
  titleLarge: { size: 22, lh: 28, w: 500, role: 'display' },
  titleMedium: { size: 16, lh: 24, w: 600, role: 'body' },
  titleSmall: { size: 14, lh: 20, w: 600, role: 'body' },
  bodyLarge: { size: 16, lh: 24, w: 400, role: 'body' },
  bodyMedium: { size: 14, lh: 20, w: 400, role: 'body' },
  bodySmall: { size: 12, lh: 16, w: 400, role: 'body' },
  labelLarge: { size: 14, lh: 20, w: 600, role: 'body' },
  labelMedium: { size: 12, lh: 16, w: 600, role: 'body' },
};
const FONTS = {
  'Fraunces': { res: 'fraunces', css: "'Fraunces', Georgia, serif" },
  'Space Grotesk': { res: 'space_grotesk', css: "'Space Grotesk', system-ui, sans-serif" },
  'Outfit': { res: 'outfit', css: "'Outfit', system-ui, sans-serif" },
  'DM Sans': { res: 'dm_sans', css: "'DM Sans', system-ui, sans-serif" },
  'Inter': { res: 'inter', css: "'Inter', system-ui, sans-serif" },
};
const FONT_WEIGHTS = [[400, 'Normal'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']];
const TRANS = { none: 'None', fade: 'Fade', slide: 'Slide horizontal', slideUp: 'Slide up', scale: 'Scale + fade' };
const EASES = ['Emphasized', 'Standard', 'Linear', 'Spring'];
const EASE_KT = { Emphasized: 'CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)', Standard: 'FastOutSlowInEasing', Linear: 'LinearEasing' };
const BOXAL = [['TopStart', 'TopCenter', 'TopEnd'], ['CenterStart', 'Center', 'CenterEnd'], ['BottomStart', 'BottomCenter', 'BottomEnd']];
const ICONS = ['Add', 'ArrowBack', 'Check', 'ChevronRight', 'Close', 'Delete', 'Edit', 'Favorite', 'FavoriteBorder', 'Home', 'Menu', 'MoreVert', 'Notifications', 'Person', 'Remove', 'Search', 'Settings', 'Share', 'ShoppingBag', 'Star'];
const AUTOMIRRORED = new Set(['ArrowBack']);
const KOTLIN_KEYWORDS = new Set('as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while'.split(' '));
const ROUTE_ARG_TYPES = ['String', 'Int', 'Boolean'];

/* ---------- small helpers ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const pascal = s => String(s || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/^[0-9]+/, '');
const camel = s => { const p = pascal(s); return p ? p[0].toLowerCase() + p.slice(1) : ''; };
const isIdent = s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && !KOTLIN_KEYWORDS.has(s);
const isTypeName = s => /^[A-Z][A-Za-z0-9]*$/.test(s) && !KOTLIN_KEYWORDS.has(s.toLowerCase());
const isPackageName = s => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(s) && s.split('.').every(p => !KOTLIN_KEYWORDS.has(p));
const codeName = appName => { const p = pascal(appName); return isTypeName(p) ? p : 'App'; };
const pkgPath = pkg => pkg.replace(/\./g, '/');
const javaRoot = project => `app/src/main/java/${pkgPath(project.app.packageName)}`;
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'").replace(/"/g, '\\"');

function walk(n, fn, parent = null) { fn(n, parent); (n.children || []).forEach(c => walk(c, fn, n)); }
function findNode(project, id) {
  if (!id) return null;
  for (const k of project.order) { let r = null; walk(project.screens[k].root, (n, p) => { if (!r && n.id === id) r = { node: n, parent: p, screen: k }; }); if (r) return r; }
  return null;
}
function pathTo(project, id) {
  const f = findNode(project, id); if (!f) return [];
  const out = [];
  (function rec(n, acc) { acc = [...acc, n]; if (n.id === id) { out.push(...acc); return true; } return (n.children || []).some(c => rec(c, acc)); })(project.screens[f.screen].root, []);
  return out;
}
function maxId(project) { let m = 0; project.order.forEach(k => walk(project.screens[k].root, n => { const v = Number(String(n.id).slice(1)); if (v > m) m = v; })); return m; }

/* ---------- screens & view models ---------- */
function screenInfo(project, key) {
  const s = project.screens[key];
  const name = s.name;
  return { name, fn: `${name}Screen`, file: `${name}Screen.kt`, pkg: `${project.app.packageName}.ui.${name.toLowerCase()}`, route: name, path: `${javaRoot(project)}/ui/${name.toLowerCase()}/${name}Screen.kt` };
}
function vmFor(project, key) { return project.viewModels[project.screens[key].viewModel]; }

/* ---------- Kotlin ViewModel parsing (structural, tolerant) ---------- */
function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }
function matchBrace(src, open) { let d = 0; for (let i = open; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return i; } } return src.length; }
function parseVM(src = '') {
  const classes = {}; const reHead = /data\s+class\s+(\w+)\s*\(/g; let m;
  while ((m = reHead.exec(src))) {
    let i = reHead.lastIndex, d = 1; const s = i;
    while (i < src.length && d) { if (src[i] === '(') d++; else if (src[i] === ')') d--; i++; }
    const fields = [];
    src.slice(s, i - 1).replace(/va[lr]\s+(\w+)\s*:\s*([\w.]+(?:<[\w.?, ]+>)?\??)/g, (_, n, t) => { fields.push({ name: n, type: t }); return _; });
    classes[m[1]] = fields;
  }
  const out = {
    classes, package: (src.match(/^\s*package\s+([\w.]+)/m) || [])[1] || '',
    className: (src.match(/^[ \t]*(?:(?:open|abstract|internal|public)\s+)*class\s+(\w+)[^{;\n]*:\s*ViewModel\s*\(/m) || [])[1] || '',
    stateProp: 'state', uiState: '', iface: '', handler: 'onEvent', eventParam: 'event',
    events: [], handled: new Set(), handledLine: {}, whenLine: 0, all: false, errors: [],
  };
  const sf = src.match(/val\s+(\w+)\s*:\s*StateFlow<\s*(\w+)\s*>/); if (sf) { out.stateProp = sf[1]; out.uiState = sf[2]; }
  const ifaces = [...src.matchAll(/sealed\s+(?:interface|class)\s+(\w+)/g)].map(x => x[1]);
  const fnRe = /fun\s+(\w+)\s*\(\s*(\w+)\s*:\s*(\w+)\s*\)/g; let f;
  while ((f = fnRe.exec(src))) { if (ifaces.includes(f[3])) { out.handler = f[1]; out.eventParam = f[2]; out.iface = f[3]; break; } }
  if (!out.iface && ifaces.length) out.iface = ifaces[0];
  if (out.iface) {
    const si = src.match(new RegExp(`sealed\\s+(?:interface|class)\\s+${out.iface}[^{]*\\{`));
    if (si) {
      const open = si.index + si[0].length - 1, close = matchBrace(src, open), body = src.slice(open + 1, close);
      const re = /(?:data\s+class\s+(\w+)|(?:data\s+)?object\s+(\w+))/g; let e;
      while ((e = re.exec(body))) { const name = e[1] || e[2]; out.events.push({ name, params: e[1] ? (classes[name] || []) : [], line: lineOf(src, open + 1 + e.index) }); }
    }
  }
  const w = src.match(new RegExp(`when\\s*\\(\\s*${out.eventParam}\\s*\\)\\s*\\{`));
  if (w) {
    const open = w.index + w[0].length - 1, close = matchBrace(src, open), body = src.slice(open + 1, close);
    const re = /(?:is\s+)?\w+\.(\w+)\s*->/g; let h;
    while ((h = re.exec(body))) { out.handled.add(h[1]); out.handledLine[h[1]] = lineOf(src, open + 1 + h.index); }
    out.whenLine = lineOf(src, w.index);
    if (/\belse\s*->/.test(body)) out.all = true;
  }
  if (!out.className) out.errors.push('No class extending ViewModel() was found.');
  if (!out.uiState) out.errors.push('No `val state: StateFlow<YourUiState>` property was found.');
  else if (!classes[out.uiState]) out.errors.push(`The UI state class ${out.uiState} must be a data class.`);
  if (!out.iface) out.errors.push('No sealed interface for events was found.');
  else if (!sf || !src.match(new RegExp(`fun\\s+\\w+\\s*\\(\\s*\\w+\\s*:\\s*${out.iface}\\s*\\)`))) out.errors.push(`No function that takes a ${out.iface} (such as fun onEvent(event: ${out.iface})) was found.`);
  return out;
}
const isHandled = (model, name) => model.all || model.handled.has(name);
function elemType(t) { return ((t || '').match(/List<\s*(\w+)\s*>/) || [])[1]; }
function typeOf(path, vars, model) {
  if (!model) return null;
  const segs = String(path).split('.'); let t = segs[0] === 'state' ? model.uiState : (vars || {})[segs[0]];
  if (!t) return null;
  for (let i = 1; i < segs.length; i++) { const cls = model.classes[t.replace('?', '')]; if (!cls) return null; const fd = cls.find(x => x.name === segs[i]); if (!fd) return null; t = (t.endsWith('?') && !fd.type.endsWith('?')) ? fd.type + '?' : fd.type; }
  return t;
}
function nullableHop(path, vars, model) {
  // Converts a binding path into Kotlin, inserting ?. after nullable hops.
  const segs = String(path).split('.'); let t = segs[0] === 'state' ? model?.uiState : (vars || {})[segs[0]]; let out = segs[0];
  for (let i = 1; i < segs.length; i++) {
    const nullable = !!t && t.endsWith('?'); out += (nullable ? '?.' : '.') + segs[i];
    const cls = model?.classes[(t || '').replace('?', '')]; const fd = cls && cls.find(x => x.name === segs[i]);
    t = fd ? ((nullable && !fd.type.endsWith('?')) ? fd.type + '?' : fd.type) : null;
  }
  return { code: out, type: t };
}
function varsFor(project, id, model) {
  const vars = {};
  pathTo(project, id).forEach(n => { if (n.type === 'List' && n.id !== id) { const el = elemType(typeOf(n.props.items, vars, model)); if (el) vars[n.props.item] = el; } });
  return vars;
}
function bindingPaths(vars, model, types = /^(String|Int)\??$/) {
  const out = []; if (!model) return out;
  const add = (prefix, cls, depth, nullable) => (model.classes[cls] || []).forEach(f => {
    const t = f.type.replace('?', ''), ft = nullable && !f.type.endsWith('?') ? f.type + '?' : f.type;
    if (types.test(ft)) out.push({ path: `${prefix}.${f.name}`, type: ft });
    else if (depth < 1 && model.classes[t]) add(`${prefix}.${f.name}`, t, depth + 1, nullable || f.type.endsWith('?'));
  });
  Object.entries(vars || {}).forEach(([v, cls]) => add(v, cls, 0, false));
  add('state', model.uiState, 0, false);
  return out;
}
function defaultPreview(model) {
  const val = (t, d) => { const b = t.replace('?', ''); if (t.endsWith('?')) return null; if (b === 'String') return ''; if (b === 'Int' || b === 'Long' || b === 'Double' || b === 'Float') return 0; if (b === 'Boolean') return false; if (/^List</.test(b)) return []; if (model.classes[b] && d < 2) return obj(b, d + 1); return null; };
  const obj = (cls, d) => Object.fromEntries((model.classes[cls] || []).map(f => [f.name, val(f.type, d)]));
  return model?.uiState ? obj(model.uiState, 0) : {};
}

/* ---------- Kotlin codegen ---------- */
function ktString(str) { return '"' + String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$') + '"'; }
function ktTextExpr(str, vars, model) {
  const s = String(str ?? '');
  const whole = s.match(/^\{([\w.]+)\}$/);
  if (whole) { const h = nullableHop(whole[1], vars, model); if (h.type === 'String') return h.code; if (h.type === 'String?') return h.code + '.orEmpty()'; return '"${' + h.code + '}"'; }
  let out = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$');
  out = out.replace(/\{([\w.]+)\}/g, (_, p) => { const h = nullableHop(p, vars, model); return '${' + h.code + (h.type && h.type.endsWith('?') ? '.orEmpty()' : '') + '}'; });
  return '"' + out + '"';
}
function ktArg(arg, vars, model, wantType) {
  const s = String(arg ?? '').trim();
  if (!s) return wantType === 'String' ? '""' : wantType === 'Boolean' ? 'false' : '0';
  if (/^".*"$/.test(s) || /^-?\d+(\.\d+)?$/.test(s) || s === 'true' || s === 'false' || s === 'it') return s;
  const h = nullableHop(s, vars, model);
  if (h.type && h.type.endsWith('?')) return h.code + (wantType === 'String' || h.type === 'String?' ? '.orEmpty()' : (h.type === 'Int?' ? ' ?: 0' : ''));
  return h.code;
}
const padStr = pd => { const x = pd.x || 0, y = pd.y || 0; if (x === y) return `padding(${x}.dp)`; if (!y) return `padding(horizontal = ${x}.dp)`; if (!x) return `padding(vertical = ${y}.dp)`; return `padding(horizontal = ${x}.dp, vertical = ${y}.dp)`; };
function actionKt(project, a, vars, model) {
  if (a.kind === 'event') {
    const ev = model?.events.find(e => e.name === a.event); const has = ev ? ev.params.length > 0 : !!a.arg;
    return `onEvent(${model?.iface || 'Event'}.${a.event || 'Unknown'}${has ? `(${ktArg(a.arg, vars, model, ev?.params[0]?.type.replace('?', ''))})` : ''})`;
  }
  if (a.kind === 'navigate') {
    const t = project.screens[a.to]; if (!t) return '/* missing destination */ Unit';
    const args = t.args || [];
    return `onNavigate(Route.${t.name}${args.length ? `(${args.map((p, i) => `${p.name} = ${ktArg(i === 0 ? a.arg : '', vars, model, p.type)}`).join(', ')})` : ''})`;
  }
  return 'onBack()';
}
function modParts(n, parent) {
  const p = n.props, m = [];
  if (p.animateItem && parent?.type === 'List') m.push('animateItem()');
  if (p.weight && parent && ['Row', 'Column', 'Card'].includes(parent.type)) m.push(`weight(${p.weight}f)`);
  const W = p.w, H = p.h;
  if (W === 'fill' && H === 'fill') m.push('fillMaxSize()');
  else if (typeof W === 'number' && W === H) m.push(`size(${W}.dp)`);
  else { if (W === 'fill') m.push('fillMaxWidth()'); else if (typeof W === 'number') m.push(`width(${W}.dp)`); if (H === 'fill') m.push('fillMaxHeight()'); else if (typeof H === 'number') m.push(`height(${H}.dp)`); }
  const noBox = ['Card', 'Button', 'TextField', 'Switch', 'Divider'];
  if (p.radius && !noBox.includes(n.type)) m.push(`clip(RoundedCornerShape(${p.radius}.dp))`);
  if (p.bg && !noBox.includes(n.type)) m.push(`background(MaterialTheme.colorScheme.${p.bg})`);
  if (!parent) m.push('safeDrawingPadding()');
  if ((p.actions || []).length && ['Row', 'Column', 'Box', 'Image', 'Text'].includes(n.type)) m.push({ click: p.actions });
  if (p.scroll && n.type === 'Column') m.push('verticalScroll(rememberScrollState())');
  if (p.animateSize) m.push('animateContentSize()');
  if (p.pad && (p.pad.x || p.pad.y) && !['Card', 'Button', 'Divider'].includes(n.type)) m.push(padStr(p.pad));
  return m;
}
function layoutArgs(n) {
  const p = n.props, a = [];
  if (n.type === 'Box') { if (p.balign && p.balign !== 'TopStart') a.push(`contentAlignment = Alignment.${p.balign}`); return a; }
  const col = n.type !== 'Row'; let arr = null;
  if (p.arr === 'between') arr = 'Arrangement.SpaceBetween';
  else if (p.gap) { const al = p.arr === 'center' ? (col ? 'Alignment.CenterVertically' : 'Alignment.CenterHorizontally') : p.arr === 'end' ? (col ? 'Alignment.Bottom' : 'Alignment.End') : ''; arr = `Arrangement.spacedBy(${p.gap}.dp${al ? ', ' + al : ''})`; }
  else if (p.arr === 'center') arr = 'Arrangement.Center';
  else if (p.arr === 'end') arr = col ? 'Arrangement.Bottom' : 'Arrangement.End';
  if (arr) a.push(`${col ? 'verticalArrangement' : 'horizontalArrangement'} = ${arr}`);
  const al = p.align === 'center' ? (col ? 'Alignment.CenterHorizontally' : 'Alignment.CenterVertically') : p.align === 'end' ? (col ? 'Alignment.End' : 'Alignment.Bottom') : null;
  if (al) a.push(`${col ? 'horizontalAlignment' : 'verticalAlignment'} = ${al}`);
  return a;
}
function genNode(ctx, n, parent, d, vars, L, ranges) {
  const { project, model } = ctx;
  const I = '    '.repeat(d), I1 = I + '    ', start = L.length, p = n.props, acts = p.actions || [];
  const P = t => L.push({ t, id: n.id });
  const mods = modParts(n, parent);
  const base = parent ? 'Modifier' : 'modifier';
  const act = a => actionKt(project, a, vars, model);
  const emitMods = (ms, ind, b = 'Modifier') => {
    if (!ms.length) { if (b === 'modifier') P(`${ind}modifier = modifier,`); return; }
    if (ms.length === 1 && typeof ms[0] === 'string') { P(`${ind}modifier = ${b}.${ms[0]},`); return; }
    P(`${ind}modifier = ${b}`);
    ms.forEach((m, i) => { const c = i === ms.length - 1 ? ',' : '';
      if (typeof m === 'string') P(`${ind}    .${m}${c}`);
      else if (m.click.length === 1) P(`${ind}    .clickable { ${act(m.click[0])} }${c}`);
      else { P(`${ind}    .clickable {`); m.click.forEach(x => P(`${ind}        ${act(x)}`)); P(`${ind}    }${c}`); } });
  };
  const emitLambda = (name, list, ind) => {
    if (!list.length) P(`${ind}${name} = {},`);
    else if (list.length === 1) P(`${ind}${name} = { ${act(list[0])} },`);
    else { P(`${ind}${name} = {`); list.forEach(a => P(`${ind}    ${act(a)}`)); P(`${ind}},`); }
  };
  const kids = (dd, v) => n.children.forEach(c => genNode(ctx, c, n, dd, v, L, ranges));
  const changeEvent = (nm) => { const ev = model?.events.find(e => e.name === p.change?.event); return ev ? `{ onEvent(${model.iface}.${ev.name}(it)) }` : '{}'; };
  if (parent && CONTAINERS.has(n.type) && n.name !== n.type) P(`${I}// ${n.name}`);
  switch (n.type) {
    case 'Column': case 'Row': case 'Box': {
      const args = layoutArgs(n);
      if (!mods.length && !args.length && parent) P(`${I}${n.type} {`); else { P(`${I}${n.type}(`); emitMods(mods, I1, base); args.forEach(a => P(`${I1}${a},`)); P(`${I}) {`); }
      kids(d + 1, vars); P(`${I}}`); break;
    }
    case 'Card': {
      P(`${I}Card(`); if (acts.length) emitLambda('onClick', acts, I1); emitMods(mods, I1, base);
      if (p.radius) P(`${I1}shape = RoundedCornerShape(${p.radius}.dp),`);
      if (p.bg) P(`${I1}colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.${p.bg}),`);
      P(`${I}) {`);
      const inner = p.pad && (p.pad.x || p.pad.y) ? [padStr(p.pad)] : [], la = layoutArgs({ ...n, type: 'Column' });
      if (!inner.length && !la.length) P(`${I1}Column {`); else { P(`${I1}Column(`); if (inner.length) P(`${I1}    modifier = Modifier.${inner[0]},`); la.forEach(a => P(`${I1}    ${a},`)); P(`${I1}) {`); }
      kids(d + 2, vars); P(`${I1}}`); P(`${I}}`); break;
    }
    case 'List': {
      const la = layoutArgs({ ...n, type: 'Column' });
      if (!mods.length && !la.length) P(`${I}LazyColumn {`); else { P(`${I}LazyColumn(`); emitMods(mods, I1, base); la.forEach(a => P(`${I1}${a},`)); P(`${I}) {`); }
      const el = elemType(typeOf(p.items, vars, model)), fields = (model?.classes[el]) || [];
      const nested = fields.find(f => (model.classes[f.type] || []).some(g => g.name === 'id'));
      const key = fields.some(f => f.name === 'id') ? 'it.id' : nested ? `it.${nested.name}.id` : null;
      P(`${I1}items(${nullableHop(p.items, vars, model).code}${key ? `, key = { ${key} }` : ''}) { ${p.item} ->`);
      n.children.forEach(c => genNode(ctx, c, n, d + 2, { ...vars, [p.item]: el }, L, ranges));
      P(`${I1}}`); P(`${I}}`); break;
    }
    case 'Text':
      P(`${I}Text(`); P(`${I1}text = ${ktTextExpr(p.text || '', vars, model)},`); P(`${I1}style = MaterialTheme.typography.${p.style || 'bodyLarge'},`);
      if (p.color) P(`${I1}color = MaterialTheme.colorScheme.${p.color},`); emitMods(mods, I1, base); P(`${I})`); break;
    case 'Button': {
      const fn = { filled: 'Button', tonal: 'FilledTonalButton', outlined: 'OutlinedButton', text: 'TextButton' }[p.variant || 'filled'];
      P(`${I}${fn}(`); emitLambda('onClick', acts, I1); emitMods(mods, I1, base); P(`${I}) {`); P(`${I1}Text(${ktTextExpr(p.text || '', vars, model)})`); P(`${I}}`); break;
    }
    case 'IconButton': {
      if (acts.length <= 1 && !mods.length && parent) P(`${I}IconButton(onClick = { ${acts[0] ? act(acts[0]) : ''} }) {`);
      else { P(`${I}IconButton(`); emitLambda('onClick', acts, I1); emitMods(mods, I1, base); P(`${I}) {`); }
      const ic = `Icon(${AUTOMIRRORED.has(p.icon) ? 'Icons.AutoMirrored.Rounded.' : 'Icons.Rounded.'}${p.icon}, contentDescription = ${p.desc ? ktString(p.desc) : 'null'})`;
      if (p.badge) { P(`${I1}BadgedBox(badge = { Badge { Text(${ktTextExpr(p.badge, vars, model)}) } }) {`); P(`${I1}    ${ic}`); P(`${I1}}`); } else P(`${I1}${ic}`);
      P(`${I}}`); break;
    }
    case 'Image':
      if (p.src) { P(`${I}AsyncImage(`); P(`${I1}model = ${nullableHop(p.src, vars, model).code},`); P(`${I1}placeholder = painterResource(R.drawable.placeholder),`); P(`${I1}error = painterResource(R.drawable.placeholder),`); }
      else { P(`${I}Image(`); P(`${I1}painter = painterResource(R.drawable.placeholder),`); }
      P(`${I1}contentDescription = null,`); P(`${I1}contentScale = ContentScale.Crop,`); emitMods(mods, I1, base); P(`${I})`); break;
    case 'TextField': {
      const v = p.value ? nullableHop(p.value.replace(/^\{|\}$/g, ''), vars, model) : null;
      P(`${I}OutlinedTextField(`); P(`${I1}value = ${v ? v.code + (v.type && v.type.endsWith('?') ? '.orEmpty()' : '') : '""'},`); P(`${I1}onValueChange = ${changeEvent()},`);
      if (p.label) P(`${I1}label = { Text(${ktTextExpr(p.label, vars, model)}) },`); P(`${I1}singleLine = true,`); emitMods(mods, I1, base); P(`${I})`); break;
    }
    case 'Switch': {
      const v = p.checked ? nullableHop(p.checked.replace(/^\{|\}$/g, ''), vars, model) : null;
      P(`${I}Switch(`); P(`${I1}checked = ${v ? v.code + (v.type && v.type.endsWith('?') ? ' == true' : '') : 'false'},`); P(`${I1}onCheckedChange = ${changeEvent()},`); emitMods(mods, I1, base); P(`${I})`); break;
    }
    case 'Divider': { const m = mods.filter(x => typeof x === 'string'); P(`${I}HorizontalDivider(${m.length ? `modifier = Modifier.${m.join('.')}` : ''})`); break; }
    case 'Spacer': { const m = mods.filter(x => typeof x === 'string'); P(`${I}Spacer(Modifier${m.length ? '.' + m.join('.') : ''})`); break; }
  }
  ranges[n.id] = [start, L.length - 1];
}
const HEADER = '// Generated by Facet from facet.json. Edit this screen in Facet: changes made here are overwritten.';
function screenImports(project, key, model) {
  const pkg = project.app.packageName, vmPkg = model?.package || `${pkg}.ui`;
  return ['androidx.compose.animation.animateContentSize', 'androidx.compose.foundation.Image', 'androidx.compose.foundation.background', 'androidx.compose.foundation.clickable',
    'androidx.compose.foundation.layout.*', 'androidx.compose.foundation.lazy.LazyColumn', 'androidx.compose.foundation.lazy.items', 'androidx.compose.foundation.rememberScrollState',
    'androidx.compose.foundation.shape.RoundedCornerShape', 'androidx.compose.foundation.verticalScroll', 'androidx.compose.material.icons.Icons',
    'androidx.compose.material.icons.automirrored.rounded.*', 'androidx.compose.material.icons.rounded.*', 'androidx.compose.material3.*', 'androidx.compose.runtime.Composable',
    'androidx.compose.ui.Alignment', 'androidx.compose.ui.Modifier', 'androidx.compose.ui.draw.clip', 'androidx.compose.ui.layout.ContentScale', 'androidx.compose.ui.res.painterResource',
    'androidx.compose.ui.tooling.preview.Preview', 'androidx.compose.ui.unit.dp', 'coil3.compose.AsyncImage', `${pkg}.R`, `${pkg}.navigation.Route`,
    model?.uiState ? `${vmPkg}.${model.uiState}` : null, model?.iface ? `${vmPkg}.${model.iface}` : null, `${pkg}.ui.theme.${codeName(project.app.name)}Theme`].filter(Boolean);
}
function genScreen(project, key, models) {
  const info = screenInfo(project, key), s = project.screens[key], model = models[s.viewModel];
  const L = [], ranges = {}, P = t => L.push({ t, id: null });
  P('@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)'); P('');
  P(HEADER); P(`package ${info.pkg}`); P('');
  L.push({ t: 'import …', id: null, imports: screenImports(project, key, model) }); P('');
  P('@Composable'); P(`fun ${info.fn}(`);
  P(`    state: ${model?.uiState || 'Unit'},`); P(`    onEvent: (${model?.iface || 'Any'}) -> Unit,`); P('    onNavigate: (Route) -> Unit,'); P('    onBack: () -> Unit,'); P('    modifier: Modifier = Modifier,'); P(') {');
  genNode({ project, model }, s.root, null, 1, {}, L, ranges);
  P('}'); P('');
  P('@Preview(showBackground = true)'); P('@Composable'); P(`private fun ${info.fn}Preview() {`);
  P(`    ${codeName(project.app.name)}Theme {`); P(`        ${info.fn}(state = ${model?.uiState || 'Unit'}(), onEvent = {}, onNavigate = {}, onBack = {})`); P('    }'); P('}');
  return { lines: L, ranges };
}
function specKt(c) { return c.ease === 'Spring' ? 'spring(stiffness = Spring.StiffnessMediumLow)' : `tween(${c.dur}, easing = ${EASE_KT[c.ease] || 'FastOutSlowInEasing'})`; }
function transKt(c) {
  const s = specKt(c);
  switch (c.type) {
    case 'fade': return [`fadeIn(${s})`, `fadeOut(${s})`];
    case 'slide': return [`slideIntoContainer(SlideDirection.Start, ${s})`, `slideOutOfContainer(SlideDirection.End, ${s})`];
    case 'slideUp': return [`slideIntoContainer(SlideDirection.Up, ${s})`, `slideOutOfContainer(SlideDirection.Down, ${s})`];
    case 'scale': return [`scaleIn(${s}, initialScale = 0.92f) + fadeIn()`, `scaleOut(${s}, targetScale = 0.92f) + fadeOut()`];
    default: return ['EnterTransition.None', 'ExitTransition.None'];
  }
}
function usedViewModels(project) { const ids = []; project.order.forEach(k => { const v = project.screens[k].viewModel; if (v && project.viewModels[v] && !ids.includes(v)) ids.push(v); }); return ids; }
function vmVar(project, id, model) { const cn = model?.className || project.viewModels[id].name; return camel(cn); }
function genNav(project, models) {
  const pkg = project.app.packageName, app = codeName(project.app.name), L = [], P = t => L.push({ t, id: null });
  const vms = usedViewModels(project);
  const imports = ['androidx.compose.animation.*', 'androidx.compose.animation.AnimatedContentTransitionScope.SlideDirection', 'androidx.compose.animation.core.*', 'androidx.compose.runtime.Composable',
    'androidx.compose.runtime.getValue', 'androidx.lifecycle.compose.collectAsStateWithLifecycle', 'androidx.lifecycle.viewmodel.compose.viewModel', 'androidx.navigation.NavHostController',
    'androidx.navigation.compose.NavHost', 'androidx.navigation.compose.composable', 'androidx.navigation.compose.rememberNavController', 'kotlinx.serialization.Serializable',
    ...project.order.map(k => { const i = screenInfo(project, k); return `${i.pkg}.${i.fn}`; }),
    ...vms.map(id => { const m = models[id]; return m?.package && m.className ? `${m.package}.${m.className}` : null; }).filter(Boolean)];
  P('// Generated by Facet from facet.json. Navigation and transitions are edited in Facet.'); P(`package ${pkg}.navigation`); P('');
  L.push({ t: 'import …', id: null, imports }); P('');
  P('@Serializable'); P('sealed interface Route {');
  project.order.forEach(k => { const s = project.screens[k]; P((s.args || []).length ? `    @Serializable data class ${s.name}(${s.args.map(a => `val ${a.name}: ${a.type}`).join(', ')}) : Route` : `    @Serializable data object ${s.name} : Route`); });
  P('}'); P('');
  P('@Composable'); P(`fun ${app}NavHost(navController: NavHostController = rememberNavController()) {`);
  vms.forEach(id => { const m = models[id], v = vmVar(project, id, m), cn = m?.className || project.viewModels[id].name; P(`    val ${v}: ${cn} = viewModel()`); P(`    val ${v.replace(/ViewModel$/, '') || v}State by ${v}.${m?.stateProp || 'state'}.collectAsStateWithLifecycle()`); });
  P('    val navigate: (Route) -> Unit = { route ->'); P('        if (!navController.popBackStack(route, inclusive = false)) {'); P('            navController.navigate(route) { launchSingleTop = true }'); P('        }'); P('    }'); P('');
  const startArgs = project.screens[project.start].args || [];
  P(`    NavHost(navController = navController, startDestination = Route.${project.screens[project.start].name}${startArgs.length ? `(${startArgs.map(a => `${a.name} = ${a.type === 'String' ? '""' : a.type === 'Boolean' ? 'false' : '0'}`).join(', ')})` : ''}) {`);
  project.order.forEach(k => {
    const s = project.screens[k], i = screenInfo(project, k), [en, ex] = transKt(s.enter), m = models[s.viewModel], v = vmVar(project, s.viewModel, m);
    P(`        composable<Route.${s.name}>(`); P(`            enterTransition = { ${en} },`); P(`            popExitTransition = { ${ex} },`); P('        ) {');
    P(`            ${i.fn}(`); P(`                state = ${v.replace(/ViewModel$/, '') || v}State,`); P(`                onEvent = ${v}::${m?.handler || 'onEvent'},`); P('                onNavigate = navigate,'); P('                onBack = { navController.popBackStack() },'); P('            )'); P('        }');
  });
  P('    }'); P('}');
  return { lines: L, ranges: {} };
}
function themeFonts(project) { const t = project.theme, fams = [...new Set([t.display, t.body])]; return fams.map(f => FONTS[f]?.res).filter(Boolean); }
function genTheme(project) {
  const t = project.theme, pkg = project.app.packageName, app = codeName(project.app.name), L = [], P = s => L.push({ t: s, id: null });
  const fam = name => `FontFamily(${FONT_WEIGHTS.map(([w, n]) => `Font(R.font.${FONTS[name].res}_${w}, FontWeight.${n})`).join(', ')})`;
  const WN = { 400: 'Normal', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
  P('// Generated by Facet from facet.json. Edit colors and type in Facet\'s Theme panel.'); P(`package ${pkg}.ui.theme`); P('');
  L.push({ t: 'import …', id: null, imports: ['androidx.compose.foundation.isSystemInDarkTheme', 'androidx.compose.material3.MaterialTheme', 'androidx.compose.material3.Typography', 'androidx.compose.material3.darkColorScheme',
    'androidx.compose.material3.lightColorScheme', 'androidx.compose.runtime.Composable', 'androidx.compose.ui.graphics.Color', 'androidx.compose.ui.text.TextStyle', 'androidx.compose.ui.text.font.Font',
    'androidx.compose.ui.text.font.FontFamily', 'androidx.compose.ui.text.font.FontWeight', 'androidx.compose.ui.unit.sp', `${pkg}.R`] }); P('');
  P(`val DisplayFont = ${fam(t.display)}`); P(`val BodyFont = ${fam(t.body)}`); P('');
  [['LightColors', 'lightColorScheme', t.light], ['DarkColors', 'darkColorScheme', t.dark]].forEach(([n, f, pal]) => { P(`private val ${n} = ${f}(`); COLOR_KEYS.forEach(k => P(`    ${k} = Color(0xFF${pal[k].slice(1).toUpperCase()}),`)); P(')'); P(''); });
  P(`private val ${app}Typography = Typography(`);
  Object.entries(TYPE).forEach(([k, v]) => P(`    ${k} = TextStyle(fontFamily = ${v.role === 'display' ? 'DisplayFont' : 'BodyFont'}, fontWeight = FontWeight.${WN[v.w]}, fontSize = ${v.size}.sp, lineHeight = ${v.lh}.sp),`));
  P(')'); P(''); P('@Composable'); P(`fun ${app}Theme(`); P('    darkTheme: Boolean = isSystemInDarkTheme(),'); P('    content: @Composable () -> Unit,'); P(') {');
  P('    MaterialTheme('); P('        colorScheme = if (darkTheme) DarkColors else LightColors,'); P(`        typography = ${app}Typography,`); P('        content = content,'); P('    )'); P('}');
  return { lines: L, ranges: {} };
}
function genMainActivity(project) {
  const pkg = project.app.packageName, app = codeName(project.app.name);
  return `// Generated by Facet. Wires the theme and navigation graph into the activity.
package ${pkg}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import ${pkg}.navigation.${app}NavHost
import ${pkg}.ui.theme.${app}Theme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            ${app}Theme {
                ${app}NavHost()
            }
        }
    }
}
`;
}
const linesToSource = lines => lines.map(l => l.t === 'import …' && l.imports ? l.imports.map(i => 'import ' + i).join('\n') : l.t).join('\n') + '\n';

/* ---------- Android project template ---------- */
function scaffoldFiles(project) {
  const pkg = project.app.packageName, name = project.app.name, V = VERSIONS;
  return {
    'settings.gradle.kts': `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = ${JSON.stringify(name)}
include(":app")
`,
    'build.gradle.kts': `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
`,
    'gradle.properties': `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.caching=true
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`,
    'gradle/libs.versions.toml': `[versions]
agp = "${V.agp}"
kotlin = "${V.kotlin}"
composeBom = "${V.composeBom}"
iconsExtended = "${V.iconsExtended}"
coreKtx = "${V.coreKtx}"
activityCompose = "${V.activityCompose}"
lifecycle = "${V.lifecycle}"
navigation = "${V.navigation}"
serialization = "${V.serialization}"
coil = "${V.coil}"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended", version.ref = "iconsExtended" }
androidx-lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "serialization" }
coil-compose = { group = "io.coil-kt.coil3", name = "coil-compose", version.ref = "coil" }
coil-network-okhttp = { group = "io.coil-kt.coil3", name = "coil-network-okhttp", version.ref = "coil" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
`,
    'app/build.gradle.kts': `import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "${pkg}"
    compileSdk = ${V.compileSdk}

    defaultConfig {
        applicationId = "${pkg}"
        minSdk = ${project.app.minSdk || V.minSdk}
        targetSdk = ${V.targetSdk}
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
`,
    'app/proguard-rules.pro': '# Project-specific R8 rules. Navigation routes are @Serializable and kept by kotlinx-serialization\'s rules.\n',
    'app/src/main/AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.App">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
    'app/src/main/res/values/themes.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
`,
    'app/src/main/res/values-night/themes.xml': `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App" parent="android:Theme.Material.NoActionBar" />
</resources>
`,
    'app/src/main/res/drawable/ic_launcher_foreground.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M38,34h32a4,4 0,0 1,4 4v8a4,4 0,0 1,-4 4H38a4,4 0,0 1,-4 -4v-8a4,4 0,0 1,4 -4zM38,56h18a4,4 0,0 1,4 4v10a4,4 0,0 1,-4 4H38a4,4 0,0 1,-4 -4V60a4,4 0,0 1,4 -4zM68,56h2a4,4 0,0 1,4 4v10a4,4 0,0 1,-4 4h-2a4,4 0,0 1,-4 -4V60a4,4 0,0 1,4 -4z" />
</vector>
`,
    'app/src/main/res/mipmap-anydpi/ic_launcher.xml': `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`,
    '.gitignore': `*.iml
.gradle/
/local.properties
/.idea/
.DS_Store
/build/
/app/build/
/captures/
.externalNativeBuild/
.cxx/
`,
    'README.md': `# ${name}

Created with Facet. Open this folder in Facet to edit screens, or in Android Studio to work on the code.

- Screens, navigation and theme under \`ui/\` and \`navigation/\` are generated from \`facet.json\`. Edit them in Facet.
- ViewModels are your code. Facet reads their state and events but never overwrites changes you make elsewhere.

Build from the command line: \`./gradlew :app:installDebug\`
`,
  };
}
function generatedFiles(project, sources) {
  const models = modelsFor(project, sources), root = javaRoot(project), out = {};
  project.order.forEach(k => { out[screenInfo(project, k).path] = linesToSource(genScreen(project, k, models).lines); });
  out[`${root}/navigation/NavGraph.kt`] = linesToSource(genNav(project, models).lines);
  out[`${root}/ui/theme/Theme.kt`] = linesToSource(genTheme(project).lines);
  out[`${root}/MainActivity.kt`] = genMainActivity(project);
  out['app/src/main/res/values/strings.xml'] = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by Facet -->\n<resources>\n    <string name="app_name">${xmlEsc(project.app.name)}</string>\n</resources>\n`;
  out['app/src/main/res/values/ic_launcher_colors.xml'] = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by Facet from the theme's primary color -->\n<resources>\n    <color name="ic_launcher_background">${project.theme.light.primary.toUpperCase()}</color>\n</resources>\n`;
  out['app/src/main/res/drawable/placeholder.xml'] = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated by Facet: shown while images load or when they fail -->\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="${project.theme.light.surfaceContainer.toUpperCase()}" />\n</shape>\n`;
  return out;
}
function fontFiles(project) { const out = {}; themeFonts(project).forEach(res => FONT_WEIGHTS.forEach(([w]) => { out[`app/src/main/res/font/${res}_${w}.ttf`] = `fonts/${res}_${w}.ttf`; })); return out; }
function modelsFor(project, sources) { const m = {}; Object.keys(project.viewModels).forEach(id => { m[id] = parseVM((sources || {})[id] || ''); }); return m; }

/* ---------- starter templates ---------- */
let seq = 0;
const N = (type, name, props = {}, children) => { const n = { id: 'n' + (++seq), type, name: name || type, props }; if (CONTAINERS.has(type)) n.children = children || []; return n; };
const DEFAULT_THEME = () => ({
  mode: 'light', display: 'Fraunces', body: 'DM Sans',
  light: { primary: '#7A4A22', onPrimary: '#FFFFFF', primaryContainer: '#FFDCC2', onPrimaryContainer: '#2E1500', secondaryContainer: '#F4DED0', onSecondaryContainer: '#2B1A10', surface: '#FFF8F4', surfaceContainer: '#F7EBE3', onSurface: '#221A15', onSurfaceVariant: '#54443A', outline: '#86736A', error: '#BA1A1A', onError: '#FFFFFF' },
  dark: { primary: '#F4BA8A', onPrimary: '#4A2706', primaryContainer: '#653B16', onPrimaryContainer: '#FFDCC2', secondaryContainer: '#3F2E24', onSecondaryContainer: '#F4DED0', surface: '#19120D', surfaceContainer: '#271E18', onSurface: '#F0DFD6', onSurfaceVariant: '#D8C2B6', outline: '#A08D83', error: '#FFB4AB', onError: '#690005' },
});
const BLUE_THEME = () => ({
  mode: 'light', display: 'Space Grotesk', body: 'Inter',
  light: { primary: '#3F51D8', onPrimary: '#FFFFFF', primaryContainer: '#DFE0FF', onPrimaryContainer: '#000C61', secondaryContainer: '#E0E1F9', onSecondaryContainer: '#181A2C', surface: '#FBF8FF', surfaceContainer: '#EFEDF6', onSurface: '#1B1B21', onSurfaceVariant: '#46464F', outline: '#777680', error: '#BA1A1A', onError: '#FFFFFF' },
  dark: { primary: '#BCC2FF', onPrimary: '#0F1F98', primaryContainer: '#2A37B0', onPrimaryContainer: '#DFE0FF', secondaryContainer: '#444559', onSecondaryContainer: '#E0E1F9', surface: '#131318', surfaceContainer: '#1F1F25', onSurface: '#E4E1E9', onSurfaceVariant: '#C7C5D0', outline: '#918F9A', error: '#FFB4AB', onError: '#690005' },
});
function viewModelSource(pkg, base, opts = {}) {
  return `package ${pkg}

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class ${base}UiState(
    val title: String = ${ktString(opts.title || base)},
    val count: Int = 0,
)

sealed interface ${base}Event {
    data object OnIncrement : ${base}Event
}

class ${base}ViewModel : ViewModel() {

    private val _state = MutableStateFlow(${base}UiState())
    val state: StateFlow<${base}UiState> = _state.asStateFlow()

    fun onEvent(event: ${base}Event) {
        when (event) {
            ${base}Event.OnIncrement -> _state.update { it.copy(count = it.count + 1) }
        }
    }
}
`;
}
function newScreenRoot(name) {
  return N('Column', `${name}Screen`, { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 24, y: 16 }, gap: 16 }, [
    N('Text', 'Title', { text: name, style: 'headlineMedium' }),
  ]);
}
function blankProject(name, pkg) {
  seq = 0; const vmPkg = `${pkg}.ui.main`;
  const project = {
    format: 'facet-project', version: 2, app: { name, packageName: pkg, minSdk: VERSIONS.minSdk }, start: 'home', order: ['home'],
    screens: {
      home: { name: 'Home', args: [], viewModel: 'main', enter: { type: 'fade', dur: 250, ease: 'Standard' },
        root: N('Column', 'HomeScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 24, y: 24 }, gap: 16, arr: 'center', align: 'center' }, [
          N('Text', 'Title', { text: '{state.title}', style: 'headlineMedium' }),
          N('Text', 'Counter', { text: 'Tapped {state.count} times', style: 'bodyLarge', color: 'onSurfaceVariant' }),
          N('Button', 'TapButton', { text: 'Tap me', variant: 'filled', actions: [{ kind: 'event', event: 'OnIncrement' }] }),
        ]) },
    },
    viewModels: { main: { name: 'MainViewModel', file: `${javaRoot({ app: { packageName: pkg } })}/ui/main/MainViewModel.kt` } },
    preview: { main: { title: `Hello, ${name}`, count: 0 } },
    theme: BLUE_THEME(),
  };
  const sources = { main: viewModelSource(vmPkg, 'Main', { title: `Hello, ${name}` }) };
  return { project, sources };
}
function sampleProject(name, pkg) {
  seq = 0; const vmPkg = `${pkg}.ui.menu`;
  const project = {
    format: 'facet-project', version: 2, app: { name, packageName: pkg, minSdk: VERSIONS.minSdk }, start: 'home', order: ['home', 'detail', 'cart'],
    screens: {
      home: { name: 'Home', args: [], viewModel: 'menu', enter: { type: 'fade', dur: 250, ease: 'Standard' },
        root: N('Column', 'HomeScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 18 }, [
          N('Row', 'TopBar', { w: 'fill', arr: 'between', align: 'center' }, [
            N('Column', 'Greeting', { gap: 2 }, [
              N('Text', 'Eyebrow', { text: 'Good morning', style: 'labelLarge', color: 'onSurfaceVariant' }),
              N('Text', 'UserName', { text: '{state.userName}', style: 'headlineSmall' }),
            ]),
            N('IconButton', 'CartButton', { icon: 'ShoppingBag', desc: 'Cart', badge: '{state.cartCount}', actions: [{ kind: 'navigate', to: 'cart' }] }),
          ]),
          N('Card', 'FeaturedCard', { w: 'fill', bg: 'primaryContainer', radius: 28, pad: { x: 20, y: 20 }, gap: 8, animateSize: true }, [
            N('Text', 'Kicker', { text: 'Seasonal pick', style: 'labelLarge' }),
            N('Text', 'FeaturedName', { text: 'Maple Oat Latte', style: 'headlineMedium' }),
            N('Text', 'FeaturedNotes', { text: 'Espresso, maple syrup and steamed oat milk.', style: 'bodyMedium' }),
            N('Button', 'OrderNow', { text: 'Order now', variant: 'filled', actions: [{ kind: 'event', event: 'OnDrinkClick', arg: '"maple-oat"' }, { kind: 'navigate', to: 'detail', arg: '"maple-oat"' }] }),
          ]),
          N('Row', 'SectionHeader', { w: 'fill', arr: 'between', align: 'center' }, [
            N('Text', 'MenuTitle', { text: 'Menu', style: 'titleLarge' }),
            N('Button', 'SeeAll', { text: 'See all', variant: 'text', actions: [] }),
          ]),
          N('List', 'DrinkList', { w: 'fill', weight: 1, gap: 8, items: 'state.drinks', item: 'drink' }, [
            N('Row', 'DrinkRow', { w: 'fill', align: 'center', gap: 14, pad: { x: 12, y: 10 }, radius: 20, bg: 'surfaceContainer', animateItem: true, actions: [{ kind: 'event', event: 'OnDrinkClick', arg: 'drink.id' }, { kind: 'navigate', to: 'detail', arg: 'drink.id' }] }, [
              N('Image', 'Thumb', { w: 52, h: 52, radius: 16, src: 'drink.imageUrl' }),
              N('Column', 'Info', { weight: 1, gap: 2 }, [
                N('Text', 'Name', { text: '{drink.name}', style: 'titleMedium' }),
                N('Text', 'Notes', { text: '{drink.notes}', style: 'bodySmall', color: 'onSurfaceVariant' }),
              ]),
              N('Text', 'Price', { text: '{drink.price}', style: 'labelLarge', color: 'primary' }),
            ]),
          ]),
        ]) },
      detail: { name: 'Detail', args: [{ name: 'drinkId', type: 'String' }], viewModel: 'menu', enter: { type: 'slide', dur: 400, ease: 'Emphasized' },
        root: N('Column', 'DetailScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 16 }, [
          N('Row', 'TopBar', { w: 'fill', arr: 'between', align: 'center' }, [
            N('IconButton', 'Back', { icon: 'ArrowBack', desc: 'Back', actions: [{ kind: 'back' }] }),
            N('IconButton', 'Favorite', { icon: 'FavoriteBorder', desc: 'Save', actions: [] }),
          ]),
          N('Image', 'Hero', { w: 'fill', h: 240, radius: 32, src: 'state.selected.imageUrl' }),
          N('Column', 'Header', { w: 'fill', gap: 6 }, [
            N('Text', 'Title', { text: '{state.selected.name}', style: 'headlineMedium' }),
            N('Text', 'Notes', { text: '{state.selected.notes}', style: 'bodyLarge', color: 'onSurfaceVariant' }),
          ]),
          N('Row', 'Quantity', { align: 'center', gap: 12, bg: 'surfaceContainer', radius: 28, pad: { x: 6, y: 6 }, animateSize: true }, [
            N('IconButton', 'Decrease', { icon: 'Remove', desc: 'Decrease', actions: [{ kind: 'event', event: 'OnQuantityChange', arg: '-1' }] }),
            N('Text', 'Count', { text: '{state.quantity}', style: 'titleLarge' }),
            N('IconButton', 'Increase', { icon: 'Add', desc: 'Increase', actions: [{ kind: 'event', event: 'OnQuantityChange', arg: '1' }] }),
          ]),
          N('Spacer', 'Push', { weight: 1 }),
          N('Button', 'AddToCart', { text: 'Add to cart · {state.total}', variant: 'filled', w: 'fill', h: 56, actions: [{ kind: 'event', event: 'OnAddToCart' }, { kind: 'navigate', to: 'cart' }] }),
        ]) },
      cart: { name: 'Cart', args: [], viewModel: 'menu', enter: { type: 'slideUp', dur: 450, ease: 'Emphasized' },
        root: N('Column', 'CartScreen', { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 20, y: 12 }, gap: 16 }, [
          N('Row', 'TopBar', { w: 'fill', align: 'center', gap: 8 }, [
            N('IconButton', 'Back', { icon: 'ArrowBack', desc: 'Back', actions: [{ kind: 'back' }] }),
            N('Text', 'Title', { text: 'Your order', style: 'titleLarge' }),
          ]),
          N('List', 'CartList', { w: 'fill', gap: 8, items: 'state.cart', item: 'item' }, [
            N('Row', 'CartRow', { w: 'fill', align: 'center', gap: 12, pad: { x: 12, y: 12 }, radius: 20, bg: 'surfaceContainer', animateItem: true }, [
              N('Image', 'Thumb', { w: 44, h: 44, radius: 14, src: 'item.drink.imageUrl' }),
              N('Column', 'Info', { weight: 1, gap: 2 }, [
                N('Text', 'Name', { text: '{item.drink.name}', style: 'titleSmall' }),
                N('Text', 'Qty', { text: 'Qty {item.quantity}', style: 'bodySmall', color: 'onSurfaceVariant' }),
              ]),
              N('Text', 'Price', { text: '{item.drink.price}', style: 'labelLarge' }),
            ]),
          ]),
          N('Spacer', 'Push', { weight: 1 }),
          N('Row', 'Total', { w: 'fill', arr: 'between', align: 'center' }, [
            N('Text', 'TotalLabel', { text: 'Total', style: 'titleMedium', color: 'onSurfaceVariant' }),
            N('Text', 'TotalValue', { text: '{state.cartTotal}', style: 'headlineSmall' }),
          ]),
          N('Button', 'Checkout', { text: 'Checkout', variant: 'filled', w: 'fill', h: 56, actions: [{ kind: 'event', event: 'OnCheckout' }, { kind: 'navigate', to: 'home' }] }),
        ]) },
    },
    viewModels: { menu: { name: 'MenuViewModel', file: `${javaRoot({ app: { packageName: pkg } })}/ui/menu/MenuViewModel.kt` } },
    preview: { menu: (() => {
      const d = [['maple-oat', 'Maple Oat Latte', 'Espresso · maple · oat milk', 5.4], ['flat-white', 'Flat White', 'Double ristretto · whole milk', 4.2], ['cold-brew', 'Cold Brew Tonic', '18-hour steep · tonic · orange', 4.8], ['matcha', 'Iced Matcha', 'Ceremonial grade · oat milk', 5.0]]
        .map(([id, n, notes, p]) => ({ id, name: n, notes, price: '$' + p.toFixed(2), unitPrice: p, imageUrl: '' }));
      return { userName: 'Ana', drinks: d, selected: d[0], quantity: 1, total: '$5.40', cart: [{ drink: d[1], quantity: 1 }, { drink: d[2], quantity: 2 }], cartCount: 3, cartTotal: '$13.80' };
    })() },
    theme: DEFAULT_THEME(),
  };
  const sources = { menu: `package ${vmPkg}

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Locale

data class Drink(
    val id: String,
    val name: String,
    val notes: String,
    val price: String,
    val unitPrice: Double,
    val imageUrl: String,
)

data class CartItem(
    val drink: Drink,
    val quantity: Int,
)

data class MenuUiState(
    val userName: String = "",
    val drinks: List<Drink> = emptyList(),
    val selected: Drink? = null,
    val quantity: Int = 1,
    val total: String = "",
    val cart: List<CartItem> = emptyList(),
    val cartCount: Int = 0,
    val cartTotal: String = "",
)

sealed interface MenuEvent {
    data class OnDrinkClick(val id: String) : MenuEvent
    data class OnQuantityChange(val delta: Int) : MenuEvent
    data object OnAddToCart : MenuEvent
    data object OnCheckout : MenuEvent
}

class MenuViewModel : ViewModel() {

    private val _state = MutableStateFlow(
        MenuUiState(userName = "Ana", drinks = sampleDrinks, selected = sampleDrinks.first()).withTotals()
    )
    val state: StateFlow<MenuUiState> = _state.asStateFlow()

    fun onEvent(event: MenuEvent) {
        when (event) {
            is MenuEvent.OnDrinkClick -> _state.update { s ->
                s.copy(selected = s.drinks.firstOrNull { it.id == event.id }, quantity = 1).withTotals()
            }
            is MenuEvent.OnQuantityChange -> _state.update { s ->
                s.copy(quantity = (s.quantity + event.delta).coerceIn(1, 9)).withTotals()
            }
            MenuEvent.OnAddToCart -> _state.update { s ->
                val drink = s.selected ?: return@update s
                s.copy(cart = s.cart.add(drink, s.quantity)).withTotals()
            }
            MenuEvent.OnCheckout -> _state.update { it.copy(cart = emptyList()).withTotals() }
        }
    }
}

private val sampleDrinks = listOf(
    Drink("maple-oat", "Maple Oat Latte", "Espresso · maple · oat milk", money(5.40), 5.40, ""),
    Drink("flat-white", "Flat White", "Double ristretto · whole milk", money(4.20), 4.20, ""),
    Drink("cold-brew", "Cold Brew Tonic", "18-hour steep · tonic · orange", money(4.80), 4.80, ""),
    Drink("matcha", "Iced Matcha", "Ceremonial grade · oat milk", money(5.00), 5.00, ""),
)

private fun List<CartItem>.add(drink: Drink, quantity: Int): List<CartItem> {
    val existing = firstOrNull { it.drink.id == drink.id } ?: return this + CartItem(drink, quantity)
    return map { if (it === existing) it.copy(quantity = it.quantity + quantity) else it }
}

private fun MenuUiState.withTotals(): MenuUiState = copy(
    total = money((selected?.unitPrice ?: 0.0) * quantity),
    cartCount = cart.sumOf { it.quantity },
    cartTotal = money(cart.sumOf { it.drink.unitPrice * it.quantity }),
)

private fun money(value: Double): String = String.format(Locale.US, "$%.2f", value)
` };
  return { project, sources };
}
function newViewModel(project, base) {
  const id = camel(base) || 'vm';
  const pkg = `${project.app.packageName}.ui.${base.toLowerCase()}`;
  return { id, vm: { name: `${base}ViewModel`, file: `${javaRoot(project)}/ui/${base.toLowerCase()}/${base}ViewModel.kt` }, source: viewModelSource(pkg, base), preview: { title: base, count: 0 } };
}
function validateProject(p) {
  const errs = [];
  if (!p || p.format !== 'facet-project') return ['This file is not a Facet project.'];
  if (p.version !== 2) errs.push('This project was made by an older Facet version.');
  if (!p.app || !isPackageName(p.app.packageName || '')) errs.push('The package name is missing or invalid.');
  if (!Array.isArray(p.order) || !p.order.length || !p.order.every(k => p.screens?.[k]?.root)) errs.push('The project has no screens.');
  if (!p.screens?.[p.start]) errs.push('The start screen is missing.');
  if (!p.viewModels || !Object.keys(p.viewModels).length) errs.push('The project has no ViewModels.');
  return errs;
}

const api = {
  VERSIONS, CONTAINERS, COLOR_KEYS, ON, TYPE, FONTS, FONT_WEIGHTS, TRANS, EASES, EASE_KT, BOXAL, ICONS, KOTLIN_KEYWORDS, ROUTE_ARG_TYPES, HEADER,
  clone, pascal, camel, isIdent, isTypeName, isPackageName, codeName, javaRoot, walk, findNode, pathTo, maxId,
  screenInfo, vmFor, parseVM, isHandled, elemType, typeOf, nullableHop, varsFor, bindingPaths, defaultPreview,
  actionKt, genScreen, genNav, genTheme, genMainActivity, linesToSource, scaffoldFiles, generatedFiles, fontFiles, modelsFor,
  blankProject, sampleProject, newViewModel, newScreenRoot, viewModelSource, validateProject, usedViewModels,
  makeNode: (type, name, props, children) => { const n = N(type, name, props, children); return n; },
  setSeq: v => { seq = Math.max(seq, v); },
};
if (typeof module === 'object' && module.exports) module.exports = api;
else root.FacetCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
