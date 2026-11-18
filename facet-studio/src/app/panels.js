'use strict';
/* Facet editor — top bar, left panels (layers, theme, project) and the inspector. */

function renderTop() {
  if (!project) return;
  $('#screenTabs').innerHTML = order().map(k => `<button role="tab" data-screen="${k}" class="${st.view === 'screen' && st.screen === k ? 'on' : ''}">${esc(scr(k).name)}</button>`).join('')
    + `<button data-add-screen title="New screen" aria-label="New screen" ${st.tool === 'play' ? 'disabled' : ''}>${ui('plus', 13)}</button>`
    + `<button data-flow class="${st.view === 'flow' ? 'on' : ''}" ${st.tool === 'play' ? 'disabled' : ''}>${ui('flow', 13)}Flow</button>`;
  $('#toolTabs').innerHTML = `<button data-tool="design" class="${st.tool === 'design' ? 'on' : ''}" title="Design (Esc)">${ui('cursor', 13)}<span class="tl">Design</span></button><button data-tool="play" class="${st.tool === 'play' ? 'on' : ''}" title="Prototype (P)">${ui('play', 13)}<span class="tl">Prototype</span></button>`;
  $('#layTabs').innerHTML = ['design', 'split', 'code'].map(m => `<button data-mode="${m}" class="${st.mode === m ? 'on' : ''}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('');
  $('#leftTabs').innerHTML = [['layers', 'layers', 'Layers'], ['theme', 'palette', 'Theme'], ['project', 'box3d', 'Project']].map(([k, i, l]) => `<button data-ltab="${k}" class="${st.leftTab === k ? 'on' : ''}">${ui(i, 13)}${l}</button>`).join('');
  $('#mtabs').innerHTML = [['layers', 'layers', 'Layers'], ['canvas', 'phone', 'Canvas'], ['inspect', 'props', 'Properties'], ['code', 'code', 'Code']].map(([k, ic, l]) => `<button data-mtab="${k}" class="${st.mtab === k ? 'on' : ''}">${ui(ic, 16)}${l}</button>`).join('');
  appEl.dataset.mode = st.mode; appEl.dataset.mtab = st.mtab;
  renderRunBar(); renderProj();
}
function renderCanvasTools() {
  $('#cvTL').innerHTML = `<button data-cv="undo" title="Undo (⌘Z)" ${undoStack.length ? '' : 'disabled'}>${ui('undo', 15)}</button><button data-cv="redo" title="Redo (⇧⌘Z)" ${redoStack.length ? '' : 'disabled'}>${ui('redo', 15)}</button><span class="sep"></span><button data-cv="theme" title="Preview the app's ${project.theme.mode === 'light' ? 'dark' : 'light'} scheme (⇧⌘L)">${ui('palette', 15)}</button>`;
  $('#cvTR').innerHTML = (st.view === 'flow' && st.tool !== 'play' ? '' : `<button data-cv="out" title="Zoom out">${ui('minus', 15)}</button><span class="zl">${Math.round(st.z * 100)}%</span><button data-cv="in" title="Zoom in">${ui('plus', 15)}</button><button data-cv="fit" title="Zoom to fit">${ui('fit', 15)}</button><span class="sep"></span>`)
    + `<select id="previewDevice" class="mini-sel" aria-label="Preview size">${Object.entries(DEVICES).map(([k, d]) => `<option value="${k}" ${st.device === k ? 'selected' : ''}>${d.label}</option>`).join('')}</select>`;
}
function renderHint() {
  const h = $('#cvHint'); if (!h) return;
  if (st.tool === 'play') { h.className = 'cv-hint play'; h.innerHTML = `${ui('play', 12)}<b>Prototype</b> · ${navStack.map(k => esc(scr(k)?.name || k)).join(' › ')} · events are logged, state comes from preview data · <kbd>Esc</kbd> to exit`; }
  else if (st.view === 'flow') { h.className = 'cv-hint'; h.innerHTML = `${ui('flow', 12)} Navigation links from Interactions · click a screen to edit it`; }
  else { h.className = 'cv-hint'; h.innerHTML = `Click to select · drag to reorder · <kbd>⌫</kbd> delete · <kbd>⌘D</kbd> duplicate · <kbd>Esc</kbd> parent · <kbd>P</kbd> prototype`; }
}

/* ---------- left panels ---------- */
function renderLeft() {
  $('#leftLayers').hidden = st.leftTab !== 'layers'; $('#leftTheme').hidden = st.leftTab !== 'theme'; $('#leftProject').hidden = st.leftTab !== 'project';
  if (st.leftTab === 'theme') renderThemePanel(); else if (st.leftTab === 'project') renderProjectPanel(); else renderLayers();
}
function renderLayers() {
  const s = scr(), i = info(); $('#treeHead').innerHTML = `${esc(i.fn)} <em>${esc(i.file)}</em>`;
  const rows = [];
  (function rec(n, d) {
    const has = n.children && n.children.length, coll = st.collapsed.has(n.id), p = n.props;
    const bound = /\{/.test((p.text || '') + (p.badge || '') + (p.value || '') + (p.checked || '')) || p.src;
    rows.push(`<div class="lr ${st.sel === n.id ? 'sel' : ''}" role="treeitem" data-id="${n.id}" draggable="${d > 0}" style="--d:${d}"><button class="lr-caret ${has ? '' : 'none'} ${coll ? 'coll' : ''}" data-caret="${n.id}" tabindex="-1" aria-label="Toggle">${ui('chev', 11)}</button><span class="lr-ic">${ui(TYPEICON[n.type], 14)}</span><span class="lr-name">${esc(n.name)}</span>${n.type === 'List' ? `<span class="lr-meta">${esc(p.items)}</span>` : ''}${bound ? `<span class="lr-b" title="Bound to state">${ui('link', 12)}</span>` : ''}${(p.actions || []).length || p.change?.event ? `<span class="lr-b fl" title="Has actions">${ui('bolt', 12)}</span>` : ''}</div>`);
    if (has && !coll) n.children.forEach(c => rec(c, d + 1));
  })(s.root, 0);
  treeEl.innerHTML = rows.join('');
}
$('#palette').innerHTML = ['Column', 'Row', 'Box', 'Card', 'Text', 'Button', 'IconButton', 'Image', 'TextField', 'Switch', 'Divider', 'Spacer'].map(t => `<button data-insert="${t}" title="Insert ${t}">${ui(TYPEICON[t], 16)}${{ IconButton: 'Icon btn', TextField: 'Text field' }[t] || t}</button>`).join('');
function renderThemePanel() {
  const t = project.theme, pal = t[t.mode];
  $('#leftTheme').innerHTML = `<section class="sec"><h3>Preview scheme</h3><div class="seg"><button data-thmode="light" class="${t.mode === 'light' ? 'on' : ''}">Light</button><button data-thmode="dark" class="${t.mode === 'dark' ? 'on' : ''}">Dark</button></div><p class="hint">Edits write to <code>${t.mode === 'light' ? 'LightColors' : 'DarkColors'}</code> in Theme.kt.</p></section>
  <section class="sec"><h3>Color scheme <em>Material 3</em></h3><div class="toks">${C.COLOR_KEYS.map(k => `<label class="tok"><span class="tok-sw" style="background:${pal[k]}"><input type="color" data-color="${k}" value="${pal[k].toLowerCase()}" aria-label="${k}"></span><span class="tok-n">${k}</span><code>${pal[k].toUpperCase()}</code></label>`).join('')}</div></section>
  <section class="sec"><h3>Typography <em>bundled into res/font</em></h3><div class="size-row"><span class="nl">Display</span><select data-font="display" aria-label="Display font">${DISPLAY_FONTS.map(f => `<option ${f === t.display ? 'selected' : ''}>${f}</option>`).join('')}</select></div><div class="size-row"><span class="nl">Body</span><select data-font="body" aria-label="Body font">${BODY_FONTS.map(f => `<option ${f === t.body ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
  <div class="tscale">${Object.entries(C.TYPE).map(([k, v]) => `<button class="ts-row" data-applystyle="${k}" title="Apply to selected text"><span class="ts-${k} ts-sample">Aa</span><span class="ts-n">${k}</span><span class="ts-m">${v.size}/${v.lh}</span></button>`).join('')}</div><p class="hint">Select a Text layer, then click a style to apply it.</p></section>`;
}
function renderProjectPanel() {
  const a = project.app, vmIds = Object.keys(project.viewModels), pv = st.previewVm && project.viewModels[st.previewVm] ? st.previewVm : vmIds[0];
  st.previewVm = pv;
  const usedBy = id => order().filter(k => scr(k).viewModel === id).map(k => scr(k).name);
  const json = JSON.stringify(project.preview?.[pv] ?? {}, null, 2);
  $('#leftProject').innerHTML = `<section class="sec"><h3>App</h3>
    <div class="size-row"><span class="nl">Name</span><input class="txtin" data-app="name" value="${esc(a.name)}" aria-label="App name"></div>
    <div class="size-row"><span class="nl">Package</span><code class="ro" title="Set when the project was created">${esc(a.packageName)}</code></div>
    <div class="size-row"><span class="nl">Min SDK</span><select data-app="minSdk" aria-label="Minimum SDK">${[24, 26, 28, 29, 30, 31, 33].map(v => `<option value="${v}" ${a.minSdk === v ? 'selected' : ''}>API ${v}</option>`).join('')}</select></div>
    ${projectDir ? `<div class="pathline" title="${esc(projectDir)}">${ui('folder', 12)}<span>${esc(projectDir)}</span></div><div class="f2"><button class="tbtn" data-cmd="reveal">${ui('folder', 13)}Show in Finder</button><button class="tbtn" data-cmd="studio">${ui('external', 13)}Android Studio</button></div>` : ''}
  </section>
  <section class="sec"><h3>Screens <em>${order().length}</em></h3><div class="plist">${order().map((k, i) => `<div class="prow ${st.screen === k ? 'on' : ''}"><button class="prow-main" data-open-screen="${k}">${ui('phone', 13)}<b>${esc(scr(k).name)}</b>${project.start === k ? '<span class="chip fl">start</span>' : ''}<span class="prow-m">${esc(project.viewModels[scr(k).viewModel]?.name || '—')}</span></button><button class="act-x" data-move-screen="${k}" data-dir="-1" ${i ? '' : 'disabled'} title="Move up">${ui('up', 11)}</button><button class="act-x" data-move-screen="${k}" data-dir="1" ${i < order().length - 1 ? '' : 'disabled'} title="Move down">${ui('down', 11)}</button></div>`).join('')}</div><button class="chipbtn" data-add-screen>${ui('plus', 12)}New screen</button></section>
  <section class="sec"><h3>ViewModels <em>your Kotlin</em></h3><div class="plist">${vmIds.map(id => { const m = models[id], used = usedBy(id); return `<div class="prow"><button class="prow-main" data-open-vm="${id}">${ui('code', 13)}<b>${esc(project.viewModels[id].name)}</b><span class="prow-m">${used.length ? esc(used.join(', ')) : 'unused'}</span>${m?.errors.length ? `<span class="chip bad" title="${esc(m.errors.join(' '))}">${m.errors.length} issue${m.errors.length > 1 ? 's' : ''}</span>` : ''}</button><button class="act-x" data-del-vm="${id}" ${used.length || vmIds.length < 2 ? 'disabled' : ''} title="${used.length ? 'In use by a screen' : 'Remove from project (the file stays on disk)'}">${ui('trash', 11)}</button></div>`; }).join('')}</div><button class="chipbtn" data-add-vm>${ui('plus', 12)}New ViewModel</button></section>
  <section class="sec"><h3>Preview data <em>what the canvas shows</em></h3>
    ${vmIds.length > 1 ? `<select data-preview-vm aria-label="ViewModel">${vmIds.map(id => `<option value="${id}" ${id === pv ? 'selected' : ''}>${esc(models[id]?.uiState || project.viewModels[id].name)}</option>`).join('')}</select>` : `<code class="ro">${esc(models[pv]?.uiState || '')}</code>`}
    <textarea class="json" id="previewJson" spellcheck="false" aria-label="Preview data JSON">${esc(json)}</textarea>
    <div class="json-status" id="jsonStatus"></div>
    <div class="f2"><button class="tbtn" data-cmd="preview-defaults" title="Rebuild from the UiState fields">${ui('reset', 13)}From UiState</button><button class="tbtn" data-cmd="preview-format">${ui('check', 13)}Format</button></div>
    <p class="hint">Sample values for the canvas and prototype. Your app uses the real state from ${esc(models[pv]?.className || 'the ViewModel')}.</p></section>`;
}

/* ---------- inspector ---------- */
const sec = (title, body, c = '') => `<section class="sec ${c}"><h3>${title}</h3>${body}</section>`;
const numIn = (path, val, o = {}) => `<label class="num ${o.dis ? 'dis' : ''}">${o.label ? `<span class="nl">${o.label}</span>` : ''}<input type="number" data-p="${path}" data-kind="num" value="${val ?? ''}" ${o.min != null ? `min="${o.min}"` : ''} ${o.step ? `step="${o.step}"` : ''} placeholder="${o.ph || ''}" ${o.dis ? 'disabled' : ''} aria-label="${esc(o.aria || path)}">${o.unit ? `<span class="nu">${o.unit}</span>` : ''}</label>`;
const toggle = (path, on, label, hint, attr = 'data-p') => `<label class="tg"><input type="checkbox" ${attr}="${path}" ${on ? 'checked' : ''}><span class="tg-ui"></span><span class="tg-l">${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
const selectEl = (attrs, opts, val) => `<select ${attrs}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
function sampleScope(id) { const el = $(`#content [data-id="${id}"][data-inst="${st.inst}"]`) || $(`#content [data-id="${id}"]`); return scopes[el?.dataset.scope] || scopes.s0 || { state: previewOf() }; }

function renderInspector() {
  if (!project) { inspEl.innerHTML = ''; return; }
  if (st.tool === 'play') { inspEl.innerHTML = playPanel(); return; }
  const f = find(st.sel);
  if (!f) { inspEl.innerHTML = `<div class="empty-ins"><b>${esc(info().fn)}</b><span>Select a layer on the canvas, in the layer tree, or click a line of code.</span></div>` + screenSection(st.screen); return; }
  const n = f.node, parent = f.parent, path = pathTo(n.id);
  let h = `<div class="ins-head"><div class="crumbs-i">${path.slice(0, -1).map(x => `<button data-crumb="${x.id}">${esc(x.name)}</button>${ui('chev', 10)}`).join('')}</div>
    <div class="ins-title"><span class="ins-ic">${ui(TYPEICON[n.type], 15)}</span><input class="ins-name" data-name value="${esc(n.name)}" aria-label="Layer name"><span class="chip">${TYPELABEL[n.type] || n.type}</span></div>
    <div class="ins-tools"><button class="tbtn" data-cmd="code" title="Reveal in code">${ui('code', 13)}Code</button><button class="tbtn icon" data-cmd="up" title="Move up (⌥↑)" ${parent ? '' : 'disabled'}>${ui('up', 13)}</button><button class="tbtn icon" data-cmd="down" title="Move down (⌥↓)" ${parent ? '' : 'disabled'}>${ui('down', 13)}</button><button class="tbtn icon" data-cmd="dup" title="Duplicate (⌘D)" ${parent && parent.type !== 'List' ? '' : 'disabled'}>${ui('dup', 13)}</button><button class="tbtn icon" data-cmd="del" title="Delete (⌫)" ${parent ? '' : 'disabled'}>${ui('trash', 13)}</button></div>`;
  const listAnc = path.slice(0, -1).reverse().find(x => x.type === 'List');
  if (listAnc) { const cnt = (resolve(listAnc.props.items || '', { state: previewOf() }) || []).length; h += `<div class="note">${ui('list', 13)}<span>Inside the item template of <code>items(${esc(listAnc.props.items)})</code>. Edits apply to all ${cnt} preview rows.</span></div>`; }
  h += '</div>';
  if (!parent) h += screenSection(st.screen);
  if (n.type === 'List') h += listSection(n);
  else if (C.CONTAINERS.has(n.type)) h += layoutSection(n, parent);
  h += sizeSection(n, parent);
  if (n.type === 'Text' || n.type === 'Button') h += textSection(n);
  if (n.type === 'IconButton') h += iconSection(n);
  if (n.type === 'Image') h += imageSection(n);
  if (n.type === 'TextField' || n.type === 'Switch') h += inputSection(n);
  if (['Column', 'Row', 'Box', 'Card', 'Image'].includes(n.type)) h += appearanceSection(n);
  if (['Button', 'IconButton', 'Row', 'Column', 'Box', 'Card', 'Image', 'Text'].includes(n.type)) h += interactionSection(n);
  h += motionSection(n, parent);
  inspEl.innerHTML = h;
}
function screenSection(key) {
  const s = scr(key), c = s.enter, vmIds = Object.keys(project.viewModels);
  const args = (s.args || []).map((a, i) => `<div class="argrow"><input class="txtin mono" data-arg="${i}" data-f="name" value="${esc(a.name)}" aria-label="Argument name">${selectEl(`data-arg="${i}" data-f="type" aria-label="Argument type"`, C.ROUTE_ARG_TYPES, a.type)}<button class="act-x" data-del-arg="${i}" title="Remove argument">${ui('x', 12)}</button></div>`).join('');
  return sec(`${ui('phone', 13)} Screen`, `<div class="size-row"><span class="nl">Name</span><input class="txtin" data-screen-name value="${esc(s.name)}" aria-label="Screen name"></div>
  <div class="size-row"><span class="nl">State</span>${selectEl('data-screen-vm aria-label="ViewModel"', vmIds.map(id => [id, project.viewModels[id].name]), s.viewModel)}</div>
  <div class="flabel">Route arguments · <code>Route.${esc(s.name)}${(s.args || []).length ? `(${s.args.map(a => `${a.name}: ${a.type}`).join(', ')})` : ''}</code></div>${args}<button class="chipbtn" data-add-arg>${ui('plus', 12)}Argument</button>
  <div class="f2"><button class="chipbtn ${project.start === key ? 'on' : ''}" data-set-start ${project.start === key ? 'disabled' : ''}>${project.start === key ? 'Start destination' : 'Make start'}</button><button class="chipbtn danger" data-del-screen ${order().length < 2 ? 'disabled' : ''}>${ui('trash', 12)}Delete</button></div>`)
  + sec(`${ui('motion', 13)} Enter transition <em>pop reverses it</em>`, `${selectEl(`data-enter="type" data-scr="${key}" aria-label="Enter transition"`, Object.entries(C.TRANS), c.type)}
  <div class="f2"><label class="num ${c.ease === 'Spring' ? 'dis' : ''}"><input type="number" data-enter="dur" data-scr="${key}" value="${c.dur}" min="50" step="50" ${c.ease === 'Spring' ? 'disabled' : ''} aria-label="Duration"><span class="nu">ms</span></label>${selectEl(`data-enter="ease" data-scr="${key}" aria-label="Easing"`, C.EASES, c.ease)}</div>
  <div class="curve-box">${curveSvg(c.ease)}<div class="mini-col"><div class="mini" id="mini-${key}"><i></i></div><button class="chipbtn" data-replay="${key}">${ui('play', 11)}Preview</button></div></div>`);
}
function curveSvg(ease) {
  const W = 118, H = 76, P = 10; let d;
  if (ease === 'Spring') { const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48, y = 1 - Math.exp(-5 * t) * Math.cos(9 * t); pts.push(`${P + t * (W - 2 * P)} ${H - P - y * (H - 2 * P) * .82}`); } d = 'M' + pts.join(' L'); }
  else { const b = { Emphasized: [.05, .7, .1, 1], Standard: [.4, 0, .2, 1], Linear: [0, 0, 1, 1] }[ease]; const X = v => P + v * (W - 2 * P), Y = v => H - P - v * (H - 2 * P) * .82; d = `M${X(0)} ${Y(0)} C${X(b[0])} ${Y(b[1])}, ${X(b[2])} ${Y(b[3])}, ${X(1)} ${Y(1)}`; }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="${ease} easing curve"><path class="cg" d="M${P} ${H - P}H${W - P}M${P} ${H - P - (H - 2 * P) * .82}H${W - P}"/><path class="cp" d="${d}"/></svg>`;
}
function layoutSection(n, parent) {
  const p = n.props, t = n.type;
  const typeSeg = t === 'Card' ? '' : `<div class="seg">${['Column', 'Row', 'Box'].map(x => `<button data-settype="${x}" class="${t === x ? 'on' : ''}">${ui(TYPEICON[x], 13)}${x}</button>`).join('')}</div>`;
  let grid = '<div class="al-grid" role="group" aria-label="Alignment">';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    let on = false, part = false;
    if (t === 'Box') on = C.BOXAL[r][c] === (p.balign || 'TopStart');
    else { const isCol = t !== 'Row', V = ['start', 'center', 'end'], mainV = V[isCol ? r : c], crossV = V[isCol ? c : r], crossOn = (p.align || 'start') === crossV; if (p.arr === 'between') part = crossOn; else on = (p.arr || 'start') === mainV && crossOn; }
    grid += `<button data-al="${r},${c}" class="${on ? 'on' : ''} ${part ? 'part' : ''}" aria-label="Align row ${r + 1} column ${c + 1}"><i></i></button>`;
  }
  grid += '</div>';
  const side = t === 'Box' ? `<p class="hint">Children stack. The grid sets <code>contentAlignment</code>.</p>` : `${numIn('gap', p.gap || 0, { label: ui('gap', 13), unit: 'dp', min: 0, aria: 'Gap' })}<button class="chipbtn ${p.arr === 'between' ? 'on' : ''}" data-between>Space between</button>`;
  let scroll = '';
  if (t === 'Column') { const lazy = []; C.walk(n, x => { if (x !== n && (x.type === 'List' || x.props.weight)) lazy.push(x.name); }); scroll = toggle('scroll', p.scroll, 'Scrollable', lazy.length && p.scroll ? `Remove weight / lazy lists inside (${lazy.slice(0, 2).join(', ')}), they can't measure in a scrolling Column` : '.verticalScroll(rememberScrollState())'); }
  return sec('Auto layout', `${typeSeg}<div class="al-wrap">${grid}<div class="al-side">${side}</div></div><div class="flabel">Padding</div><div class="f2">${numIn('pad.x', p.pad?.x || 0, { label: 'H', unit: 'dp', min: 0, aria: 'Horizontal padding' })}${numIn('pad.y', p.pad?.y || 0, { label: 'V', unit: 'dp', min: 0, aria: 'Vertical padding' })}</div>${scroll}`);
}
function listSection(n) {
  const p = n.props, m = curModel(), vars = varsFor(n.id);
  const lists = C.bindingPaths(vars, m, /^List</).map(b => [b.path, `${b.path} : ${b.type}`]);
  if (p.items && !lists.some(l => l[0] === p.items)) lists.unshift([p.items, `${p.items} (unresolved)`]);
  return sec(`${ui('list', 13)} Lazy list`, `<div class="flabel">Items</div>${selectEl('data-p="items" aria-label="Items"', lists.length ? lists : [['', 'Add a List<…> field to the UiState']], p.items)}<div class="f2"><label class="num"><span class="nl">as</span><input data-p="item" value="${esc(p.item)}" aria-label="Item name"></label>${numIn('gap', p.gap || 0, { label: ui('gap', 13), unit: 'dp', min: 0, aria: 'Gap' })}</div><p class="hint">Design the row once. <code>LazyColumn</code> renders it for every item and binds <code>${esc(p.item)}</code>.</p>`);
}
function sizeSection(n, parent) {
  if (!parent) return sec('Size', `<p class="hint">The screen root fills the window and keeps clear of system bars: <code>fillMaxSize().safeDrawingPadding()</code>.</p>`);
  const p = n.props;
  const row = (ax, lab) => { const v = p[ax], mode = v === 'fill' ? 'fill' : typeof v === 'number' ? 'fixed' : 'wrap'; return `<div class="size-row"><span class="nl">${lab}</span>${selectEl(`data-size="${ax}" aria-label="${lab} sizing"`, [['fill', 'Fill'], ['wrap', 'Wrap'], ['fixed', 'Fixed']], mode)}${numIn(ax, typeof v === 'number' ? v : '', { unit: 'dp', min: 0, dis: mode !== 'fixed', ph: '–', aria: lab + ' in dp' })}</div>`; };
  const wt = ['Row', 'Column', 'Card'].includes(parent.type) ? `<div class="size-row"><span class="nl">Weight</span>${numIn('weight', p.weight || '', { min: 0, step: 0.5, ph: 'none', aria: 'Weight' })}<span class="hint">share of free space</span></div>` : '';
  return sec('Size', row('w', 'Width') + row('h', 'Height') + wt);
}
function appearanceSection(n) {
  const p = n.props;
  return sec('Fill & shape', `<div class="swatches"><button data-token="" class="sw none ${!p.bg ? 'on' : ''}" title="No fill">${ui('x', 12)}</button>${FILL_TOKENS.map(k => `<button data-token="${k}" class="sw ${p.bg === k ? 'on' : ''}" style="background:var(--m-${k})" title="${k}" aria-label="${k}"></button>`).join('')}</div><div class="tokname">${p.bg ? `colorScheme.<b>${p.bg}</b>` : 'No fill'}</div>
  <div class="size-row"><span class="nl">Radius</span><input type="range" min="0" max="40" step="1" data-p="radius" data-kind="num" value="${p.radius || 0}" aria-label="Corner radius">${numIn('radius', p.radius || 0, { unit: 'dp', min: 0, aria: 'Corner radius dp' })}</div>`);
}
function bindOptions(n, re) { return C.bindingPaths(varsFor(n.id), curModel(), re); }
function textSection(n) {
  const p = n.props, opts = [['', 'Bind to state…'], ...bindOptions(n).map(b => [b.path, `${b.path} : ${b.type}`])];
  const hasBind = /\{[\w.]+\}/.test(p.text || '');
  let h = `<div class="txt"><input class="txtin" data-p="text" data-kind="str" value="${esc(p.text || '')}" aria-label="Text content">${selectEl('data-bind="text" aria-label="Insert a state binding"', opts, '')}${hasBind ? `<div class="resolved">${ui('link', 12)}Preview <span>“${esc(fmt(p.text, sampleScope(n.id)))}”</span></div>` : ''}</div>`;
  if (n.type === 'Text') {
    h += `<div class="size-row"><span class="nl">Style</span>${selectEl('data-p="style" aria-label="Text style"', Object.keys(C.TYPE).map(k => [k, `${k} · ${C.TYPE[k].size}sp`]), p.style || 'bodyLarge')}</div>`;
    h += `<div class="flabel">Color</div><div class="swatches"><button data-tcolor="" class="sw none ${!p.color ? 'on' : ''}" title="Inherit LocalContentColor">${ui('x', 12)}</button>${TEXT_TOKENS.map(k => `<button data-tcolor="${k}" class="sw ${p.color === k ? 'on' : ''}" style="background:var(--m-${k})" title="${k}" aria-label="${k}"></button>`).join('')}</div><div class="tokname">${p.color ? `colorScheme.<b>${p.color}</b>` : 'Inherits content color'}</div>`;
  } else h += `<div class="flabel">Variant</div><div class="seg">${[['filled', 'Filled'], ['tonal', 'Tonal'], ['outlined', 'Outlined'], ['text', 'Text']].map(([v, l]) => `<button data-pset="variant" data-v="${v}" class="${(p.variant || 'filled') === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return sec(n.type === 'Text' ? 'Text' : 'Button', h);
}
function iconSection(n) {
  const p = n.props, opts = [['', 'No badge'], ...bindOptions(n, /^(Int|String)\??$/).map(b => [`{${b.path}}`, b.path])];
  return sec('Icon', `<div class="size-row"><span class="nl">Icon</span>${selectEl('data-p="icon" aria-label="Icon"', C.ICONS, p.icon)}</div><div class="size-row"><span class="nl">Label</span><input class="txtin" data-p="desc" data-kind="str" value="${esc(p.desc || '')}" placeholder="contentDescription" aria-label="Content description"></div><div class="size-row"><span class="nl">Badge</span>${selectEl('data-p="badge" aria-label="Badge binding"', opts, p.badge || '')}</div>`);
}
function imageSection(n) {
  const p = n.props, opts = [['', 'Placeholder drawable'], ...bindOptions(n, /^String\??$/).filter(b => /url|image|photo|avatar|src/i.test(b.path)).map(b => [b.path, b.path])];
  if (p.src && !opts.some(o => o[0] === p.src)) opts.push([p.src, p.src]);
  return sec(`${ui('image', 13)} Image`, `<div class="flabel">Source · Coil <code>AsyncImage</code></div>${selectEl('data-p="src" aria-label="Image source"', opts, p.src || '')}<p class="hint">Bind a String URL field. Facet shows a placeholder; the app loads the real image.</p>`);
}
function inputSection(n) {
  const p = n.props, m = curModel(), isField = n.type === 'TextField', want = isField ? 'String' : 'Boolean';
  const vals = [['', 'Not bound'], ...bindOptions(n, isField ? /^String\??$/ : /^Boolean\??$/).map(b => [b.path, `${b.path} : ${b.type}`])];
  const evs = [['', 'No event'], ...(m?.events || []).filter(e => e.params.length === 1 && e.params[0].type.replace('?', '') === want).map(e => [e.name, `${m.iface}.${e.name}(${e.params[0].name}: ${want})`])];
  const key = isField ? 'value' : 'checked';
  return sec(isField ? 'Text field' : 'Switch', `<div class="size-row"><span class="nl">${isField ? 'Value' : 'Checked'}</span>${selectEl(`data-p="${key}" aria-label="Bound value"`, vals, p[key] || '')}</div>
  ${isField ? `<div class="size-row"><span class="nl">Label</span><input class="txtin" data-p="label" data-kind="str" value="${esc(p.label || '')}" aria-label="Label"></div>` : ''}
  <div class="flabel">${isField ? 'onValueChange' : 'onCheckedChange'} → event</div>${selectEl('data-p="change.event" aria-label="Change event"', evs, p.change?.event || '')}
  ${evs.length < 2 ? `<p class="hint">Declare an event with one ${want} parameter, for example <code>data class OnChange(val value: ${want}) : ${esc(m?.iface || 'Event')}</code>.</p>` : ''}`);
}
function interactionSection(n) {
  const acts = n.props.actions || [], vars = varsFor(n.id), m = curModel(), sugg = C.bindingPaths(vars, m).map(b => b.path);
  const cards = acts.map((a, i) => {
    let body = '', bad = false;
    if (a.kind === 'event') {
      const ev = m?.events.find(e => e.name === a.event); bad = !ev;
      const opts = (m?.events || []).map(e => [e.name, `${m.iface}.${e.name}${e.params.length ? `(${e.params.map(x => x.name).join(', ')})` : ''}`]); if (bad) opts.unshift([a.event, `${a.event}  (unresolved)`]);
      body = selectEl(`data-actf="event" data-ai="${i}" aria-label="Event"`, opts, a.event);
      if (ev?.params.length) body += `<div class="act-arg"><span>${esc(ev.params[0].name)}: ${esc(ev.params[0].type)} =</span><input class="txtin mono" data-actf="arg" data-ai="${i}" value="${esc(a.arg || '')}" list="dl-args" placeholder="value or binding" aria-label="Argument"></div>`;
      if (bad) body += `<div class="act-err">Unresolved reference '${esc(a.event)}'. Declare it in ${esc(m?.iface || 'the event interface')}.</div>`;
      else if (!C.isHandled(m, a.event)) body += `<div class="act-err">${esc(m.iface)}.${esc(a.event)} has no branch in ${esc(m.handler)}'s when.</div>`;
      if (ev && C.isHandled(m, a.event)) body += `<button class="act-link" data-jump="${esc(a.event)}">${ui('code', 12)}Open handler in ${esc(project.viewModels[scr().viewModel].name)}.kt</button>`;
    } else if (a.kind === 'navigate') {
      const t = project.screens[a.to];
      body = selectEl(`data-actf="to" data-ai="${i}" aria-label="Destination"`, order().filter(k => k !== st.screen || a.to === k).map(k => [k, `Route.${scr(k).name}`]), a.to);
      if (t?.args?.length) body += `<div class="act-arg"><span>${esc(t.args[0].name)} =</span><input class="txtin mono" data-actf="arg" data-ai="${i}" value="${esc(a.arg || '')}" list="dl-args" aria-label="Route argument"></div>`;
      if (t) body += `<div class="f2">${selectEl(`data-enter="type" data-scr="${a.to}" aria-label="Transition"`, Object.entries(C.TRANS), t.enter.type)}<label class="num ${t.enter.ease === 'Spring' ? 'dis' : ''}"><input type="number" data-enter="dur" data-scr="${a.to}" value="${t.enter.dur}" min="50" step="50" ${t.enter.ease === 'Spring' ? 'disabled' : ''} aria-label="Duration"><span class="nu">ms</span></label></div>`;
    } else body = `<p class="hint">Pops the back stack: <code>navController.popBackStack()</code>.</p>`;
    const label = { event: 'Send event', navigate: 'Navigate to', back: 'Navigate back' }[a.kind];
    return `<div class="act ${bad ? 'bad' : ''}"><div class="act-top"><span class="act-n">${i + 1}</span><span class="act-kind">${label}</span><button class="act-x" data-delact="${i}" title="Remove action" aria-label="Remove action">${ui('x', 12)}</button></div>${body}<div class="act-code">${hl(C.actionKt(project, a, vars, m))}</div></div>`;
  }).join('');
  return sec(`${ui('bolt', 13)} Interactions <em>onClick</em>`, (cards || `<p class="hint">No actions. Clicks do nothing yet.</p>`) + `<div class="add-act"><button data-addact="event">+ Event</button><button data-addact="navigate" ${order().length < 2 ? 'disabled' : ''}>+ Navigate</button><button data-addact="back">+ Back</button></div><datalist id="dl-args">${sugg.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`, 'sec-flow');
}
function motionSection(n, parent) {
  const p = n.props; let b = '';
  if ((C.CONTAINERS.has(n.type) && n.type !== 'List') || n.type === 'Text') b += toggle('animateSize', p.animateSize, 'Animate size changes', '.animateContentSize()');
  if (parent?.type === 'List') b += toggle('animateItem', p.animateItem, 'Animate item placement', '.animateItem()');
  return b ? sec(`${ui('motion', 13)} Motion`, b) : '';
}
function playPanel() {
  const s = previewOf(), rows = Object.entries(s).filter(([, v]) => v === null || typeof v !== 'object').slice(0, 14);
  const lists = Object.entries(s).filter(([, v]) => Array.isArray(v));
  return `<div class="ins-head"><div class="ins-title"><span class="ins-ic fl">${ui('play', 14)}</span><b style="font-size:14px;flex:1">Prototype</b><span class="chip fl">preview</span></div><p class="hint">Tap the device to follow navigation and see which events fire. State comes from preview data. Press <b>Run</b> to use your real ViewModel on a device.</p></div>
  ${sec('Back stack', `<div class="stack">${navStack.map((k, i) => `<span class="chip ${i === navStack.length - 1 ? 'top' : ''}">Route.${esc(scr(k)?.name || k)}</span>`).join(ui('chev', 10))}</div>`)}
  ${sec(esc(curModel()?.uiState || 'State'), `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}${lists.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.length} items</td></tr>`).join('')}</table>`)}
  ${sec('Session', `<button class="tbtn pri" data-cmd="stop">${ui('cursor', 13)}Back to design</button>`)}`;
}
