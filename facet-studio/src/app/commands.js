'use strict';
/* Facet editor — commands: layers, screens, ViewModels, prototype runtime, modes. */

function makeNode(type) {
  switch (type) {
    case 'Column': return N('Column', null, { gap: 8 }, [N('Text', null, { text: 'Column item', style: 'bodyLarge' })]);
    case 'Row': return N('Row', null, { gap: 8, align: 'center' }, [N('Text', null, { text: 'Row item', style: 'bodyLarge' })]);
    case 'Box': return N('Box', null, { w: 120, h: 80, bg: 'surfaceContainer', radius: 12, balign: 'Center' }, [N('Text', null, { text: 'Box', style: 'labelLarge' })]);
    case 'Card': return N('Card', null, { w: 'fill', bg: 'secondaryContainer', radius: 20, pad: { x: 16, y: 16 }, gap: 6 }, [N('Text', null, { text: 'Card title', style: 'titleMedium' }), N('Text', null, { text: 'Supporting text', style: 'bodyMedium' })]);
    case 'Text': return N('Text', null, { text: 'New text', style: 'bodyLarge' });
    case 'Button': return N('Button', null, { text: 'Button', variant: 'tonal', actions: [] });
    case 'IconButton': return N('IconButton', null, { icon: 'FavoriteBorder', desc: 'Favorite', actions: [] });
    case 'Image': return N('Image', null, { w: 96, h: 96, radius: 16 });
    case 'TextField': return N('TextField', null, { w: 'fill', label: 'Label' });
    case 'Switch': return N('Switch', null, {});
    case 'Divider': return N('Divider', null, {});
    case 'Spacer': return N('Spacer', null, { h: 16 });
  }
}
function insert(type) {
  if (!project || st.tool === 'play') return;
  if (st.view === 'flow') st.view = 'screen';
  const node = makeNode(type), f = find(st.sel), root = scr().root;
  mutate(() => {
    if (f && f.screen === st.screen && C.CONTAINERS.has(f.node.type) && f.node.type !== 'List') f.node.children.push(node);
    else if (f && f.screen === st.screen && f.parent && f.parent.type !== 'List') f.parent.children.splice(f.parent.children.indexOf(f.node) + 1, 0, node);
    else root.children.push(node);
  });
  select(node.id); toast(`Inserted ${type}`);
}
function cmd(c) {
  const f = find(st.sel);
  switch (c) {
    case 'del': if (!f?.parent) return toast('The screen root can’t be deleted'); mutate(() => f.parent.children.splice(f.parent.children.indexOf(f.node), 1)); toast(`Deleted ${f.node.name}`); select(f.parent.id, st.inst); break;
    case 'dup': { if (!f?.parent || f.parent.type === 'List') return; const c2 = cloneNode(f.node); mutate(() => f.parent.children.splice(f.parent.children.indexOf(f.node) + 1, 0, c2)); select(c2.id); toast(`Duplicated ${f.node.name}`); break; }
    case 'up': case 'down': { if (!f?.parent) return; const a = f.parent.children, i = a.indexOf(f.node), j = c === 'up' ? i - 1 : i + 1; if (j < 0 || j >= a.length) return; mutate(() => { a.splice(i, 1); a.splice(j, 0, f.node); }); break; }
    case 'code': st.file = 'screen:' + st.screen; if (st.mode === 'design') st.mode = 'split'; if (innerWidth <= 760) st.mtab = 'code'; else if (innerWidth <= 1180) st.mode = 'code'; renderTop(); renderCode(true); break;
    case 'clearlog': ({ log: logs, build: buildLog, logcat: logcatLog }[st.ctab] || []).length = 0; renderConsole(); break;
    case 'stop': setTool('design'); break;
    case 'reveal': bridge?.reveal(); break;
    case 'studio': bridge?.openInStudio().then(r => { if (!r?.ok) toast(r?.error || 'Android Studio was not found'); }); break;
    case 'preview-defaults': { const id = st.previewVm; mutate(() => { project.preview[id] = C.defaultPreview(models[id]); }); toast('Preview data rebuilt from the UiState fields'); break; }
    case 'preview-format': renderProjectPanel(); break;
    case 'settings': openSettings(); break;
  }
}

/* ---------- screens ---------- */
function screenNameError(name, except) {
  if (!C.isTypeName(name)) return 'Use a name like Profile: a letter first, letters and digits only, starting with a capital.';
  if (/(Screen|ViewModel)$/.test(name)) return 'Leave off the Screen suffix. Facet adds it.';
  if (['Route', 'MainActivity', 'R'].includes(name)) return `${name} is reserved.`;
  if (order().some(k => k !== except && scr(k).name.toLowerCase() === name.toLowerCase())) return `There's already a screen called ${name}.`;
  return '';
}
async function addScreen() {
  if (!project) return;
  const name = await askText({ title: 'New screen', label: 'Screen name', value: '', placeholder: 'Profile', hint: 'Creates ProfileScreen.kt and Route.Profile.', validate: v => screenNameError(C.pascal(v) || v) });
  if (!name) return;
  const nm = C.pascal(name), key = 's' + Date.now().toString(36);
  mutate(() => { project.screens[key] = { name: nm, args: [], viewModel: scr().viewModel, enter: { type: 'slide', dur: 350, ease: 'Emphasized' }, root: N('Column', `${nm}Screen`, { w: 'fill', h: 'fill', bg: 'surface', pad: { x: 24, y: 16 }, gap: 16 }, [N('Text', 'Title', { text: nm, style: 'headlineMedium' })]) }; project.order.push(key); st.screen = key; st.view = 'screen'; st.sel = null; st.file = 'screen:' + key; });
  toast(`Added ${nm}Screen`);
}
function deleteScreen(key) {
  if (order().length < 2) return;
  const nm = scr(key).name; let removed = 0;
  mutate(() => {
    delete project.screens[key]; project.order = project.order.filter(k => k !== key);
    if (project.start === key) project.start = project.order[0];
    order().forEach(k => C.walk(scr(k).root, n => { if (n.props.actions) { const before = n.props.actions.length; n.props.actions = n.props.actions.filter(a => !(a.kind === 'navigate' && a.to === key)); removed += before - n.props.actions.length; } }));
    st.screen = project.order[0]; st.sel = null; st.file = 'screen:' + st.screen;
  });
  toast(`Deleted ${nm}Screen${removed ? ` and ${removed} link${removed > 1 ? 's' : ''} to it` : ''}`);
}
function moveScreen(key, dir) { const i = order().indexOf(key), j = i + dir; if (j < 0 || j >= order().length) return; mutate(() => { const o = project.order; o.splice(i, 1); o.splice(j, 0, key); }); }

/* ---------- view models ---------- */
async function addViewModel() {
  const name = await askText({ title: 'New ViewModel', label: 'Name', placeholder: 'Profile', hint: 'Creates ProfileViewModel.kt with ProfileUiState and ProfileEvent.', validate: v => {
    const b = C.pascal(v).replace(/ViewModel$/, ''); if (!C.isTypeName(b)) return 'Use a name like Profile.';
    if (Object.values(project.viewModels).some(x => x.name === `${b}ViewModel`)) return `${b}ViewModel already exists.`; return '';
  } });
  if (!name) return;
  const base = C.pascal(name).replace(/ViewModel$/, ''), vm = C.newViewModel(project, base);
  let id = vm.id; while (project.viewModels[id]) id += '2';
  sources[id] = vm.source;
  mutate(() => { project.viewModels[id] = vm.vm; project.preview[id] = vm.preview; st.previewVm = id; }, null, { reparse: true });
  vmDirty.add(id); jumpToVm(id, 8, false); toast(`Added ${base}ViewModel.kt`);
}
function deleteViewModel(id) {
  if (order().some(k => scr(k).viewModel === id)) return toast('A screen still uses this ViewModel');
  const nm = project.viewModels[id].name;
  mutate(() => { delete project.viewModels[id]; delete project.preview[id]; delete sources[id]; }, null, { reparse: true });
  toast(`Removed ${nm} from the project. The file stays on disk.`);
}

/* ---------- prototype runtime ---------- */
function evalArg(arg, scope) { if (arg == null || arg === '') return undefined; const s = String(arg).trim(); if (/^".*"$/.test(s)) return s.slice(1, -1); if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s); if (s === 'true' || s === 'false') return s === 'true'; return resolve(s, scope); }
function fireEvent(a, scope) {
  const m = curModel(), ev = m?.events.find(e => e.name === a.event);
  if (!ev) { logLine('err', `Unresolved reference '${esc(a.event)}'. Declare it in ${esc(m?.iface || 'the event interface')}.`); return; }
  const arg = ev.params.length ? evalArg(a.arg, scope) : undefined;
  logLine('event', `${esc(m.handler)}(${esc(m.iface)}.${esc(ev.name)}${ev.params.length ? `(${esc(ev.params[0].name)} = ${esc(JSON.stringify(arg))})` : ''})`);
  if (!C.isHandled(m, ev.name)) logLine('warn', `No branch for ${esc(ev.name)} in ${esc(m.handler)}: the event is dropped`);
  const ln = m.handledLine[ev.name], vm = scr().viewModel;
  if (ln) { flashVm = ln - 1; if (currentVm() === vm) renderVmPre(); setTimeout(() => { flashVm = -1; if (currentVm() === vm) renderVmPre(); }, 900); }
}
function runActions(acts, scope, name) {
  if (!acts.length) { logLine('sys', `${esc(name)} has no click actions yet`); return; }
  acts.forEach(a => { if (a.kind === 'event') fireEvent(a, scope); });
  const nav = acts.find(a => a.kind !== 'event');
  if (nav) { if (nav.kind === 'back') goBack(); else goTo(nav.to, evalArg(nav.arg, scope)); }
  renderInspector();
}
function goTo(to, arg) {
  const from = st.screen; if (!project.screens[to] || to === from) return;
  const idx = navStack.indexOf(to), pop = idx >= 0;
  if (pop) navStack = navStack.slice(0, idx + 1); else navStack.push(to);
  const s = scr(to), e = (pop ? scr(from) : s).enter;
  logLine('nav', `navigate(Route.${esc(s.name)}${(s.args || []).length ? `(${esc(s.args[0].name)} = ${esc(JSON.stringify(arg))})` : ''}) · ${C.TRANS[e.type]} ${e.ease === 'Spring' ? 'spring' : e.dur + 'ms'}`);
  swap(from, to, pop);
}
function goBack() {
  if (navStack.length < 2) { logLine('warn', 'popBackStack(): already at the start destination'); return; }
  const from = navStack.pop(), to = navStack[navStack.length - 1]; logLine('nav', `popBackStack() → Route.${esc(scr(to).name)}`); swap(from, to, true);
}
function kf(type, pop) {
  const T = { slide: [['translateX(100%)', 'translateX(0)'], ['translateX(0)', 'translateX(-28%)']], slideUp: [['translateY(100%)', 'translateY(0)'], ['none', 'none']], fade: [null, null], scale: [['scale(.92)', 'scale(1)'], ['scale(1)', 'scale(1.04)']], none: [null, null] }[type] || [null, null];
  const fades = type === 'fade' || type === 'scale';
  const inK = [{ transform: T[0] ? T[0][0] : 'none', opacity: fades ? 0 : 1 }, { transform: T[0] ? T[0][1] : 'none', opacity: 1 }];
  const outK = [{ transform: T[1] ? T[1][0] : 'none', opacity: 1, filter: 'brightness(1)' }, { transform: T[1] ? T[1][1] : 'none', opacity: fades ? 0 : 1, filter: type === 'slideUp' || type === 'slide' ? 'brightness(.82)' : 'brightness(1)' }];
  return pop ? { top: [...inK].reverse(), under: [...outK].reverse() } : { top: inK, under: outK };
}
function swap(from, to, pop) {
  const content = $('#content'); const old = content?.querySelector('.layer'); st.screen = to;
  if (st.file?.startsWith('screen:')) st.file = 'screen:' + to;
  if (!old) { renderCanvas(); return; }
  const nl = document.createElement('div'); nl.className = 'layer enter'; nl.innerHTML = screenHTML(to, false);
  const cfg = (pop ? scr(from) : scr(to)).enter, dur = reduceMotion || cfg.type === 'none' ? 1 : (cfg.ease === 'Spring' ? 560 : cfg.dur), easing = EASE_CSS[cfg.ease], k = kf(cfg.type, pop);
  animating = true;
  let topEl, underEl; if (pop) { content.insertBefore(nl, old); topEl = old; underEl = nl; } else { content.appendChild(nl); topEl = nl; underEl = old; }
  topEl.style.zIndex = 2; underEl.style.zIndex = 1;
  const a1 = topEl.animate(k.top, { duration: dur, easing, fill: 'both' }); underEl.animate(k.under, { duration: dur, easing, fill: 'both' });
  a1.finished.then(() => { old.remove(); nl.getAnimations().forEach(x => x.cancel()); nl.style.zIndex = ''; animating = false; setTimeout(() => nl.classList.remove('enter'), 900); });
  renderTop(); renderHint(); if (st.leftTab === 'layers') renderLayers(); renderInspector(); renderCode();
}
function setTool(t) {
  if (t === st.tool || !project) return;
  if (t === 'play') { st.tool = 'play'; st.view = 'screen'; navStack = st.screen === project.start ? [project.start] : [project.start, st.screen]; logLine('sys', `Prototype started on ${esc(info().fn)}. State comes from preview data.`); }
  else { st.tool = 'design'; logLine('sys', 'Prototype stopped'); }
  refresh();
}
function setMode(m) { st.mode = m; renderTop(); requestAnimationFrame(() => { renderCanvas(); renderCode(true); }); }
function zoom(c) { if (st.view === 'flow') return; st.zoom = c === 'fit' ? 'fit' : clamp(Math.round((st.z * (c === 'in' ? 1.2 : 1 / 1.2)) * 20) / 20, 0.3, 2); renderCanvas(); }
function replay(key) {
  const box = $('#mini-' + key); if (!box) return; const i = box.querySelector('i'), c = scr(key).enter, k = kf(c.type, false);
  i.animate(k.top, { duration: reduceMotion ? 1 : (c.ease === 'Spring' ? 560 : c.dur), easing: EASE_CSS[c.ease], fill: 'none' });
}
function openScreen(k) { if (st.tool === 'play') navStack = k === project.start ? [k] : [project.start, k]; st.screen = k; st.view = 'screen'; st.sel = null; if (!st.file || st.file.startsWith('screen:')) st.file = 'screen:' + k; refresh(); }
