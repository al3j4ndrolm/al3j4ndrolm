'use strict';
/* Facet editor — code panel, Kotlin highlighting, ViewModel editor, problems, console and status bar. */

const KW = new Set('package import fun val var class data object sealed interface private override return if else when is in by true false null this constructor init companion internal const suspend'.split(' '));
const hlStr = s => esc(s).replace(/\$\{[^}]*\}/g, x => `<b class="tx">${x}</b>`);
function hl(line) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(@[A-Za-z][\w:]*)|(\b0x[0-9A-Fa-f]+\b|\b\d+(?:\.\d+)?f?\b)|([A-Za-z_]\w*)|([^\w"@/]+)|([\s\S])/g;
  let out = '', m;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) out += `<i class="tc">${esc(m[1])}</i>`;
    else if (m[2]) out += `<i class="ts">${hlStr(m[2])}</i>`;
    else if (m[3]) out += `<i class="ta">${esc(m[3])}</i>`;
    else if (m[4]) out += `<i class="tn">${esc(m[4])}</i>`;
    else if (m[5]) {
      const w = m[5], next = line.slice(re.lastIndex), prev = line.slice(0, m.index);
      if (KW.has(w)) out += `<i class="tk">${w}</i>`;
      else if (/^[A-Z]/.test(w) && /^\s*[({<]/.test(next)) out += `<i class="tf">${w}</i>`;
      else if (/^[A-Z]/.test(w)) out += `<i class="tt">${w}</i>`;
      else if (/^\s*\(/.test(next) || (/^\s*\{/.test(next) && /\.\s*$/.test(prev))) out += `<i class="tm">${w}</i>`;
      else if (/^\s*=(?!=)/.test(next) && /[(,]\s*$|^\s*$/.test(prev)) out += `<i class="tp">${w}</i>`;
      else out += esc(w);
    } else out += esc(m[6] || m[7]);
  }
  return out;
}

/* ---------- files ---------- */
const codeCache = {};
function FILES() {
  const r = C.javaRoot(project);
  return [...order().map(k => ({ key: 'screen:' + k, label: info(k).file, path: info(k).path, kind: 'screen' })),
    ...Object.entries(project.viewModels).map(([id, vm]) => ({ key: 'vm:' + id, label: vm.name + '.kt', path: vm.file, kind: 'vm' })),
    { key: 'nav', label: 'NavGraph.kt', path: `${r}/navigation/NavGraph.kt`, kind: 'gen' }, { key: 'theme', label: 'Theme.kt', path: `${r}/ui/theme/Theme.kt`, kind: 'gen' },
    { key: 'main', label: 'MainActivity.kt', path: `${r}/MainActivity.kt`, kind: 'gen' }];
}
const vmDirty = new Set();
function renderCode(scrollSel) {
  if (!project) return;
  const files = FILES(); if (!files.some(f => f.key === st.file)) st.file = 'screen:' + st.screen;
  $('#ftabs').innerHTML = files.map(f => `<button role="tab" class="ft ${st.file === f.key ? 'on' : ''}" data-file="${f.key}" title="${esc(f.path)}"><span class="kt ${f.kind === 'vm' ? 'kvm' : ''}">K</span>${esc(f.label)}${f.kind === 'vm' && vmDirty.has(f.key.slice(3)) ? '<span class="dot" title="Edited"></span>' : ''}</button>`).join('');
  const f = files.find(x => x.key === st.file);
  const badge = f.kind === 'screen' ? `<span class="badge" title="Canvas edits write here. Click a line to select its element.">${ui('layers', 11)} Generated · synced with canvas</span>`
    : f.kind === 'vm' ? `<span class="badge vm" title="Your code. Events and state you declare appear in Interactions and bindings.">${ui('bolt', 11)} Your code · feeds Interactions</span>`
    : `<span class="badge">${ui('flow', 11)} Generated from the project</span>`;
  $('#crumbs').innerHTML = `<span class="path">${esc(f.path.replace(/\//g, ' › '))}</span>${badge}`;
  if (f.kind === 'vm') { codeView.hidden = true; vmEd.hidden = false; const id = f.key.slice(3); if (vmTa.dataset.vm !== id) { vmTa.dataset.vm = id; vmTa.value = sources[id] ?? ''; vmScroll.scrollTop = 0; } renderVmPre(); return; }
  vmEd.hidden = true; codeView.hidden = false;
  const res = f.kind === 'screen' ? C.genScreen(project, f.key.slice(7), models) : f.key === 'nav' ? C.genNav(project, models) : f.key === 'theme' ? C.genTheme(project) : { lines: C.genMainActivity(project).trimEnd().split('\n').map(t => ({ t, id: null })), ranges: {} };
  const prev = codeCache[st.file], left = new Map(); (prev || []).forEach(t => left.set(t, (left.get(t) || 0) + 1));
  const range = res.ranges[st.sel];
  const errLines = new Set(buildProblems.filter(p => p.file === f.path).map(p => p.line - 1));
  codeView.innerHTML = res.lines.map((l, i) => {
    let flash = false; if (prev) { const c = left.get(l.t); if (c) left.set(l.t, c - 1); else if (l.t.trim()) flash = true; }
    const sel = range && i >= range[0] && i <= range[1];
    let mk = ''; const cm = l.t.match(/Color\(0xFF([0-9A-F]{6})\)/);
    if (cm) mk = `<i class="mk-sw" style="background:#${cm[1]}"></i>`; else if (/\bon(Event|Navigate|Back)\(/.test(l.t) && /[{]/.test(l.t)) mk = `<i class="mk-ev">${ui('bolt', 11)}</i>`; else if (l.t.trim() === '@Composable') mk = '<i class="mk-c" title="Composable"></i>';
    const ct = l.t === 'import …' ? `<i class="tk">import</i> <span class="fold" title="${esc((l.imports || []).join('\n'))}">… ${(l.imports || []).length} imports</span>` : hl(l.t);
    return `<div class="cl${sel ? ' sel' : ''}${flash ? ' flash' : ''}${errLines.has(i) ? ' err' : ''}" ${l.id ? `data-id="${l.id}"` : ''}><span class="gn">${i + 1}</span><span class="gm">${mk}</span><span class="ct">${ct || ' '}</span></div>`;
  }).join('');
  codeCache[st.file] = res.lines.map(l => l.t);
  if (scrollSel && range) { const ln = codeView.querySelector('.cl.sel'); if (ln) { const top = ln.offsetTop, vis = codeView.scrollTop, h = codeView.clientHeight; if (top < vis + 20 || top > vis + h - 60) codeView.scrollTop = Math.max(0, top - 60); } }
}
function currentVm() { return st.file?.startsWith('vm:') ? st.file.slice(3) : null; }
function renderVmPre() {
  const id = currentVm(); if (!id) return;
  const src = sources[id] ?? '', lines = src.split('\n'), file = project.viewModels[id].file;
  const errs = new Set([...problems.filter(p => p.vm === id && p.line).map(p => p.line - 1), ...buildProblems.filter(p => p.file === file).map(p => p.line - 1)]);
  vmPre.innerHTML = lines.map((l, i) => `<div class="vl${errs.has(i) ? ' err' : ''}${flashVm === i ? ' hit' : ''}">${hl(l) || ' '}</div>`).join('');
  vmGut.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
}
function jumpToVm(id, line, select = true) {
  st.file = 'vm:' + id; if (st.mode === 'design') st.mode = 'split'; if (innerWidth <= 760) st.mtab = 'code';
  renderTop(); renderCode();
  const lines = (sources[id] || '').split('\n'); line = clamp(line || 1, 1, lines.length); let off = 0; for (let i = 0; i < line - 1; i++) off += lines[i].length + 1;
  requestAnimationFrame(() => { vmScroll.scrollTop = Math.max(0, (line - 4) * 20); if (select) { vmTa.focus({ preventScroll: true }); vmTa.setSelectionRange(off + (lines[line - 1].length - lines[line - 1].trimStart().length), off + lines[line - 1].length); } });
}
function openFileAt(rel, line) {
  const f = FILES().find(x => x.path === rel);
  if (!f) { toast(`${rel.split('/').pop()}:${line} isn't shown in Facet. Open it in Android Studio.`); return; }
  if (f.kind === 'vm') return jumpToVm(f.key.slice(3), line);
  st.file = f.key; if (f.kind === 'screen') { const k = f.key.slice(7); if (k !== st.screen) { st.screen = k; st.sel = null; refresh(); } }
  if (st.mode === 'design') st.mode = 'split'; renderTop(); renderCode();
  requestAnimationFrame(() => { const el = codeView.querySelectorAll('.cl')[line - 1]; if (el) { codeView.scrollTop = Math.max(0, el.offsetTop - 80); if (el.dataset.id) select(el.dataset.id); } });
}

/* ---------- problems ---------- */
function computeProblems() {
  if (!project) return;
  const P = [];
  Object.entries(models).forEach(([id, m]) => {
    const file = project.viewModels[id].name + '.kt';
    m.errors.forEach(msg => P.push({ msg, file, vm: id, line: 1 }));
    m.events.forEach(ev => { if (!C.isHandled(m, ev.name)) P.push({ msg: `'when' must be exhaustive. Add the '${m.iface}.${ev.name}' branch.`, file, vm: id, line: m.whenLine }); });
  });
  order().forEach(k => {
    const m = modelOf(k), file = info(k).file;
    if (!m) { P.push({ msg: `${scr(k).name} uses a ViewModel that isn't in the project.`, file, screen: k }); return; }
    (function rec(n, vars) {
      const p = n.props;
      (p.actions || []).forEach(a => {
        if (a.kind === 'event' && !m.events.some(e => e.name === a.event)) P.push({ msg: `Unresolved reference '${a.event}' in ${n.name}.onClick`, file, id: n.id, screen: k });
        if (a.kind === 'navigate' && !project.screens[a.to]) P.push({ msg: `${n.name} navigates to a screen that was deleted`, file, id: n.id, screen: k });
      });
      if (p.change?.event && !m.events.some(e => e.name === p.change.event)) P.push({ msg: `Unresolved event '${p.change.event}' in ${n.name}`, file, id: n.id, screen: k });
      const paths = []; [p.text, p.badge, p.label].forEach(s => String(s || '').replace(/\{([\w.]+)\}/g, (_, x) => { paths.push(x); return _; }));
      [p.src, p.items, p.value, p.checked].forEach(x => { if (x) paths.push(String(x).replace(/^\{|\}$/g, '')); });
      paths.forEach(x => { if (!C.typeOf(x, vars, m)) P.push({ msg: `Unresolved reference '${x}' in ${n.name}`, file, id: n.id, screen: k }); });
      if (n.type === 'Column' && p.scroll) C.walk(n, x => { if (x !== n && x.type === 'List') P.push({ msg: `${x.name} is a lazy list inside the scrolling ${n.name}. It will crash at runtime; turn off Scrollable.`, file, id: n.id, screen: k }); });
      let v = vars; if (n.type === 'List') v = { ...vars, [p.item]: C.elemType(C.typeOf(p.items, vars, m)) };
      (n.children || []).forEach(c => rec(c, v));
    })(scr(k).root, {});
  });
  const names = new Set(); order().forEach(k => { const nm = scr(k).name; if (names.has(nm)) P.push({ msg: `Two screens are named ${nm}. Screen names must be unique.`, file: info(k).file, screen: k }); names.add(nm); });
  problems = P; renderConsole(); renderStatus();
}
const allProblems = () => [...buildProblems.map(p => ({ ...p, build: true })), ...problems];

/* ---------- console ---------- */
const buildLog = [], logcatLog = [];
function renderConsole() {
  const all = allProblems(), tabs = [['log', 'play', 'Run log'], ['build', 'hammer', 'Build'], ['logcat', 'phone', 'Logcat'], ['problems', 'warn', 'Problems']];
  $('#conHead').innerHTML = tabs.map(([k, ic, l]) => `<button data-ctab="${k}" class="${st.ctab === k ? 'on' : ''}">${ui(ic, 12)}${l}${k === 'problems' ? ` <span class="cnt ${all.length ? 'bad' : ''}">${all.length}</span>` : ''}</button>`).join('') + `<span class="sp"></span><button data-cmd="clearlog" title="Clear this tab">Clear</button>`;
  let h = '';
  if (st.ctab === 'problems') h = all.length ? all.map((p, i) => `<div class="pb ${p.sev === 'warning' ? 'warn' : ''}" data-prob="${i}">${ui('warn', 13)}<span>${p.build ? '<b class="pb-tag">build</b> ' : ''}${esc(p.msg)}</span><span class="loc">${esc((p.file || '').split('/').pop())}${p.line ? ':' + p.line : ''}</span></div>`).join('') : `<div class="pb-empty">No problems. Every event is handled and every binding resolves.</div>`;
  else if (st.ctab === 'build') h = buildLog.length ? buildLog.map(l => `<div class="lg ${l.kind}"><span class="mg">${esc(l.text)}</span></div>`).join('') : `<div class="pb-empty">Press <b>Run</b> to build with Gradle and install on a device. Output appears here.</div>`;
  else if (st.ctab === 'logcat') h = logcatLog.length ? logcatLog.map(l => `<div class="lg lc-${l.level}"><span class="tm">${l.level}</span><span class="lc-tag">${esc(l.tag)}</span><span class="mg">${esc(l.msg)}</span></div>`).join('') : `<div class="pb-empty">Logcat for the running app appears here after Run.</div>`;
  else h = logs.map(l => `<div class="lg ${l.kind}"><span class="tm">${l.ts}</span><span class="mg">${l.html}</span></div>`).join('');
  conBody.innerHTML = h; if (st.ctab !== 'problems') conBody.scrollTop = conBody.scrollHeight;
}
let conRaf = 0; const conLater = () => { if (!conRaf) conRaf = requestAnimationFrame(() => { conRaf = 0; renderConsole(); }); };
function logLine(kind, html) { const d = new Date(); logs.push({ kind, html, ts: d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0') }); if (logs.length > 400) logs.shift(); if (st.ctab === 'log') conLater(); }
function renderStatus() {
  if (!project) return;
  const all = allProblems(), vmCount = Object.keys(project.viewModels).length;
  $('#statusbar').innerHTML = `<span><i class="okd"></i>${order().length} screen${order().length > 1 ? 's' : ''} · ${vmCount} ViewModel${vmCount > 1 ? 's' : ''}</span><span class="probs ${all.length ? 'bad' : ''}" data-ctab="problems">${ui('warn', 12)}${all.length ? all.length + ' problem' + (all.length > 1 ? 's' : '') : 'No problems'}</span><span class="r">${esc(project.app.packageName)} · minSdk ${project.app.minSdk}</span><span>AGP ${C.VERSIONS.agp} · Kotlin ${C.VERSIONS.kotlin} · Compose BOM ${C.VERSIONS.composeBom}</span>`;
}
let syncT; function pulseSync(text) { const s = $('#sync'); if (!s) return; s.classList.add('busy'); s.querySelector('span').textContent = text || 'Updating code…'; clearTimeout(syncT); syncT = setTimeout(() => { s.classList.remove('busy'); s.querySelector('span').textContent = dirty ? 'Unsaved changes' : 'Saved to disk'; }, 650); }
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }

function refresh(o = {}) {
  if (!project) return;
  applyTheme(); renderTop(); renderCanvas();
  if (!o.keepLeft) renderLeft(); else if (st.leftTab === 'layers') renderLayers();
  if (!o.keepInspector) renderInspector();
  computeProblems(); renderCode(); pulseSync();
}
function select(id, inst = 0) {
  const f = find(id);
  if (f && f.screen !== st.screen) { st.screen = f.screen; st.view = 'screen'; if (st.file?.startsWith('screen:')) st.file = 'screen:' + f.screen; st.sel = id; st.inst = inst; refresh(); }
  st.sel = f ? id : null; st.inst = inst;
  if (f) pathTo(id).forEach(n => st.collapsed.delete(n.id));
  if (st.leftTab === 'layers') renderLayers(); renderInspector(); renderCode(true); drawOverlay();
}
