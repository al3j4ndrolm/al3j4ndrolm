'use strict';
/* Facet editor — event wiring and boot. Loaded last. */

/* ---------- global clicks ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-ctab]'); if (!b) return;
  const d = b.dataset;
  if (d.welcome === 'new') return openWizard();
  if (d.welcome === 'open') return bridge?.openDialog();
  if (d.recent) return bridge?.openPath(d.recent);
  if (d.forget) return bridge?.forgetRecent(d.forget).then(r => { recents = r; renderWelcome(); });
  if (d.cmd === 'settings') return openSettings();
  if (!project) return;
  if (d.screen && b.closest('#screenTabs')) return openScreen(d.screen);
  if ('addScreen' in d) return addScreen();
  if ('flow' in d) { st.view = 'flow'; st.sel = null; return refresh(); }
  if (d.tool) return setTool(d.tool);
  if (d.mode && b.closest('#layTabs')) return setMode(d.mode);
  if (d.mtab) { st.mtab = d.mtab; renderTop(); return requestAnimationFrame(() => { renderCanvas(); if (st.mtab === 'code') renderCode(true); }); }
  if (d.ltab) { st.leftTab = d.ltab; renderTop(); return renderLeft(); }
  if (d.ctab) { st.ctab = d.ctab; return renderConsole(); }
  if (d.file) { st.file = d.file; if (d.file.startsWith('screen:') && d.file.slice(7) !== st.screen) return openScreen(d.file.slice(7)); return renderCode(true); }
  if (d.cv) { const c = d.cv; if (c === 'undo') doUndo(); else if (c === 'redo') doRedo(); else if (c === 'theme') MENU['toggle-dark'](); else zoom(c); return; }
  if (d.cmd) return cmd(d.cmd);
  if ('run' in d) return runApp();
  if ('stop' in d) return bridge?.stop();
  if (d.openScreen) return openScreen(d.openScreen);
  if (d.moveScreen) return moveScreen(d.moveScreen, Number(d.dir));
  if (d.openVm) return jumpToVm(d.openVm, 1, false);
  if (d.delVm) return deleteViewModel(d.delVm);
  if ('addVm' in d) return addViewModel();
});
$('#conBody').addEventListener('click', e => {
  const r = e.target.closest('[data-prob]'); if (!r) return; const p = allProblems()[+r.dataset.prob]; if (!p) return;
  if (p.build && p.file) return openFileAt(p.file, p.line);
  if (p.vm) return jumpToVm(p.vm, p.line || 1);
  if (p.id) { if (st.tool === 'play') setTool('design'); select(p.id); } else if (p.screen) openScreen(p.screen);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'runTarget') { runTarget = t.value; renderRunBar(); }
  if (t.id === 'previewDevice') { st.device = t.value; refresh({ keepInspector: true }); }
});

/* ---------- left panels ---------- */
$('#palette').addEventListener('click', e => { const b = e.target.closest('[data-insert]'); if (b) insert(b.dataset.insert); });
treeEl.addEventListener('click', e => { const c = e.target.closest('[data-caret]'); if (c) { const id = c.dataset.caret; st.collapsed.has(id) ? st.collapsed.delete(id) : st.collapsed.add(id); return renderLayers(); } const r = e.target.closest('.lr'); if (r) { if (st.tool === 'play') setTool('design'); select(r.dataset.id); } });
treeEl.addEventListener('mouseover', e => { const r = e.target.closest('.lr'); const id = r?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
treeEl.addEventListener('mouseleave', () => { st.hover = null; drawOverlay(); });
let dragLayer = null;
treeEl.addEventListener('dragstart', e => { const r = e.target.closest('.lr'); if (!r) return; dragLayer = r.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragLayer); });
function dropPos(e, r) { const f = find(r.dataset.id), rect = r.getBoundingClientRect(), y = (e.clientY - rect.top) / rect.height; const canIn = C.CONTAINERS.has(f.node.type) && f.node.type !== 'List'; if (!f.parent) return 'in'; if (canIn && y > .28 && y < .72) return 'in'; return y < .5 ? 'before' : 'after'; }
treeEl.addEventListener('dragover', e => { const r = e.target.closest('.lr'); if (!r || !dragLayer) return; e.preventDefault(); $$('.lr', treeEl).forEach(x => x.classList.remove('drop-in', 'drop-before', 'drop-after')); r.classList.add('drop-' + dropPos(e, r)); });
treeEl.addEventListener('drop', e => {
  e.preventDefault(); const r = e.target.closest('.lr'); const id = dragLayer; dragLayer = null; if (!r || !id || r.dataset.id === id) return renderLayers();
  const pos = dropPos(e, r), src = find(id), tgt = find(r.dataset.id);
  if (pathTo(tgt.node.id).some(n => n.id === id)) { toast('A layer can’t move inside itself'); return renderLayers(); }
  if (pos !== 'in' && tgt.parent?.type === 'List') { toast('A lazy list holds one item template'); return renderLayers(); }
  mutate(() => { src.parent.children.splice(src.parent.children.indexOf(src.node), 1); if (pos === 'in') tgt.node.children.push(src.node); else { const a = tgt.parent.children, i = a.indexOf(tgt.node); a.splice(pos === 'after' ? i + 1 : i, 0, src.node); } });
  select(id); toast(`Moved ${src.node.name}`);
});
treeEl.addEventListener('dragend', () => { dragLayer = null; $$('.lr', treeEl).forEach(x => x.classList.remove('drop-in', 'drop-before', 'drop-after')); });
$('#leftTheme').addEventListener('input', e => { const t = e.target; if (t.dataset.color) { const k = t.dataset.color, v = t.value.toUpperCase(); mutate(() => { project.theme[project.theme.mode][k] = v; }, 'color' + k, { keepLeft: true, keepInspector: true }); t.parentElement.style.background = v; t.closest('.tok').querySelector('code').textContent = v; } });
$('#leftTheme').addEventListener('change', e => { const t = e.target; if (t.dataset.font) { mutate(() => { project.theme[t.dataset.font] = t.value; }); toast(`${t.dataset.font === 'display' ? 'DisplayFont' : 'BodyFont'} = ${t.value} (bundled into res/font)`); } });
$('#leftTheme').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.thmode) { project.theme.mode = b.dataset.thmode; refresh({ keepInspector: true }); } else if (b.dataset.applystyle) { const n = selNode(); if (n?.type === 'Text') { mutate(() => { n.props.style = b.dataset.applystyle; }); toast(`${n.name} → typography.${b.dataset.applystyle}`); } else toast('Select a Text layer first'); } });
$('#leftProject').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.app === 'name') { const v = t.value.trim(); if (v) mutate(() => { project.app.name = v; }, 'appname', { keepLeft: true, keepInspector: true }); }
  if (t.id === 'previewJson') {
    const status = $('#jsonStatus');
    try { const v = JSON.parse(t.value); if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('The preview data must be a JSON object.'); status.className = 'json-status ok'; status.textContent = 'Valid JSON · canvas updated'; mutate(() => { project.preview[st.previewVm] = v; }, 'preview' + st.previewVm, { keepLeft: true, keepInspector: true }); }
    catch (err) { status.className = 'json-status bad'; status.textContent = err.message.replace(/^JSON\.parse: /, ''); }
  }
});
$('#leftProject').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.app === 'minSdk') mutate(() => { project.app.minSdk = Number(t.value); });
  if ('previewVm' in t.dataset) { st.previewVm = t.value; renderProjectPanel(); }
});

/* ---------- inspector ---------- */
function applyField(t, keep) {
  const n = selNode(); if (!n) return; const k = t.dataset.p; let v;
  if (t.type === 'checkbox') v = t.checked || undefined;
  else if (t.dataset.kind === 'num') { v = t.value === '' ? undefined : Number(t.value); if (v != null && t.min !== '' && v < +t.min) v = +t.min; if (k === 'weight' && !v) v = undefined; }
  else if (t.tagName === 'SELECT') v = t.value === '' ? undefined : t.value;
  else v = t.value;
  mutate(() => { setPath(n.props, k, v); if (k === 'weight' && v) { const f = find(n.id); const ax = f.parent?.type === 'Row' ? 'w' : 'h'; if (n.props[ax] === 'fill' || typeof n.props[ax] === 'number') delete n.props[ax]; } }, n.id + k, { keepInspector: keep, keepLeft: true });
  if (keep) $$(`[data-p="${k}"]`, inspEl).forEach(o => { if (o !== t && o.type !== 'checkbox') o.value = t.value; });
}
function defaultArg(n, param) {
  const vars = varsFor(n.id), v = Object.keys(vars)[0], m = curModel();
  if (v) { const cls = vars[v]; if ((m.classes[cls] || []).some(f => f.name === 'id')) return `${v}.id`; const nested = (m.classes[cls] || []).find(f => (m.classes[f.type] || []).some(g => g.name === 'id')); if (nested) return `${v}.${nested.name}.id`; }
  const t = (param?.type || '').replace('?', ''); return t === 'Int' ? '1' : t === 'Boolean' ? 'true' : '""';
}
inspEl.addEventListener('input', e => {
  const t = e.target; if (t.tagName === 'SELECT' || t.type === 'checkbox') return;
  if (t.dataset.p) return applyField(t, true);
  if ('name' in t.dataset) { const n = selNode(); return mutate(() => { n.name = t.value.trim() || n.type; }, 'name' + n.id, { keepInspector: true }); }
  if (t.dataset.actf) { const n = selNode(), i = +t.dataset.ai; return mutate(() => { n.props.actions[i][t.dataset.actf] = t.value; }, n.id + 'act' + i, { keepInspector: true, keepLeft: true }); }
  if (t.dataset.enter) { const s = scr(t.dataset.scr); const v = Math.max(50, Number(t.value) || 50); return mutate(() => { s.enter.dur = v; }, 'enter' + t.dataset.scr, { keepInspector: true, keepLeft: true }); }
  if (t.dataset.arg != null && t.dataset.f === 'name') { const v = t.value.trim(); t.classList.toggle('bad', !C.isIdent(v)); if (C.isIdent(v)) mutate(() => { scr().args[+t.dataset.arg].name = v; }, 'arg' + t.dataset.arg, { keepInspector: true, keepLeft: true }); }
});
inspEl.addEventListener('change', e => {
  const t = e.target, n = selNode();
  if ('screenName' in t.dataset) { const v = C.pascal(t.value.trim()), err = screenNameError(v, st.screen); if (err) { toast(err); t.value = scr().name; return; } return mutate(() => { scr().name = v; }); }
  if ('screenVm' in t.dataset) return mutate(() => { scr().viewModel = t.value; });
  if (t.dataset.arg != null && t.dataset.f === 'type') return mutate(() => { scr().args[+t.dataset.arg].type = t.value; });
  if (t.dataset.p && (t.tagName === 'SELECT' || t.type === 'checkbox')) return applyField(t, false);
  if (t.dataset.size && n) { const ax = t.dataset.size, v = t.value; const el = $(`#content [data-id="${n.id}"]`); const measured = el ? Math.round((ax === 'w' ? el.getBoundingClientRect().width : el.getBoundingClientRect().height) / st.z) : 100; return mutate(() => { if (v === 'fill') n.props[ax] = 'fill'; else if (v === 'wrap') delete n.props[ax]; else n.props[ax] = measured; if (v !== 'wrap') { const f = find(n.id); if ((f.parent?.type === 'Row') === (ax === 'w')) delete n.props.weight; } }); }
  if (t.dataset.bind && n) { const path = t.value; if (!path) return; const cur = n.props.text || ''; return mutate(() => { n.props.text = !cur || /^\{[\w.]+\}$/.test(cur) ? `{${path}}` : `${cur} {${path}}`; }); }
  if (t.dataset.actf && t.tagName === 'SELECT' && n) { const i = +t.dataset.ai, fl = t.dataset.actf; return mutate(() => { const a = n.props.actions[i]; a[fl] = t.value; if (fl === 'event') { const ev = curModel()?.events.find(x => x.name === t.value); if (!ev?.params.length) delete a.arg; else if (!a.arg) a.arg = defaultArg(n, ev.params[0]); } if (fl === 'to') { const d = scr(t.value); if (d.args?.length) a.arg ||= defaultArg(n, d.args[0]); else delete a.arg; } }); }
  if (t.dataset.enter && t.tagName === 'SELECT') { const s = scr(t.dataset.scr); return mutate(() => { s.enter[t.dataset.enter] = t.value; }); }
});
inspEl.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const n = selNode(), d = b.dataset;
  if (d.crumb) return select(d.crumb, st.inst);
  if (d.replay) return replay(d.replay);
  if (d.jump) { const vm = scr().viewModel, ln = models[vm]?.handledLine[d.jump]; if (ln) jumpToVm(vm, ln); return; }
  if ('addArg' in d) return mutate(() => { const a = scr().args ||= []; let nm = 'id', i = 2; while (a.some(x => x.name === nm)) nm = 'id' + i++; a.push({ name: nm, type: 'String' }); });
  if (d.delArg != null) return mutate(() => { scr().args.splice(+d.delArg, 1); });
  if ('setStart' in d) return mutate(() => { project.start = st.screen; });
  if ('delScreen' in d) return deleteScreen(st.screen);
  if (!n) return;
  if (d.al) { const [r, c] = d.al.split(',').map(Number), V = ['start', 'center', 'end']; return mutate(() => { if (n.type === 'Box') n.props.balign = C.BOXAL[r][c]; else if (n.type === 'Row') { n.props.align = V[r]; if (n.props.arr !== 'between') n.props.arr = V[c]; } else { n.props.align = V[c]; if (n.props.arr !== 'between') n.props.arr = V[r]; } }); }
  if ('between' in d) return mutate(() => { n.props.arr = n.props.arr === 'between' ? 'start' : 'between'; });
  if (d.settype) { const t = d.settype; if (t === n.type) return; return mutate(() => { n.type = t; if (['Column', 'Row', 'Box'].includes(n.name)) n.name = t; }); }
  if (d.token != null) return mutate(() => setPath(n.props, 'bg', d.token || undefined));
  if (d.tcolor != null) return mutate(() => setPath(n.props, 'color', d.tcolor || undefined));
  if (d.pset) return mutate(() => { n.props[d.pset] = d.v; });
  if (d.delact != null) return mutate(() => n.props.actions.splice(+d.delact, 1));
  if (d.addact) {
    const k = d.addact, m = curModel(); let a;
    if (k === 'event') { const ev = m?.events[0]; a = { kind: 'event', event: ev?.name || 'OnClick' }; if (ev?.params.length) a.arg = defaultArg(n, ev.params[0]); }
    else if (k === 'navigate') { const to = order().find(x => x !== st.screen); a = { kind: 'navigate', to }; if (scr(to).args?.length) a.arg = defaultArg(n, scr(to).args[0]); }
    else a = { kind: 'back' };
    return mutate(() => { (n.props.actions ||= []).push(a); });
  }
});

/* ---------- canvas ---------- */
viewport.addEventListener('pointerdown', e => {
  if (!project) return;
  const res = e.target.closest('.ov-res');
  if (res) { const n = selNode(), el = $(`#content [data-id="${n.id}"][data-inst="${st.inst}"]`) || $(`#content [data-id="${n.id}"]`); if (!el) return; const r = el.getBoundingClientRect(); e.preventDefault(); resizing = { axis: res.dataset.axis, x: e.clientX, y: e.clientY, v0: Math.round((res.dataset.axis === 'x' ? r.width : r.height) / st.z), id: n.id }; return; }
  if (st.tool === 'play') return;
  if (st.view === 'flow') { const ab = e.target.closest('.ab'); if (ab) openScreen(ab.dataset.screen); return; }
  const content = $('#content'), el = e.target.closest('[data-id]');
  if (!el || !content?.contains(el)) { if (!e.target.closest('.cv-tools')) select(null); return; }
  e.preventDefault(); const id = el.dataset.id; select(id, +el.dataset.inst);
  const f = find(id); if (!f?.parent || f.parent.type === 'List') return;
  drag = { id, el, x: e.clientX, y: e.clientY, on: false, parent: f.parent };
});
window.addEventListener('pointermove', e => {
  if (resizing) { const z = st.z, dd = resizing.axis === 'x' ? e.clientX - resizing.x : e.clientY - resizing.y, v = Math.max(8, Math.round((resizing.v0 + dd / z) / 4) * 4), n = find(resizing.id)?.node; if (!n) return; const k = resizing.axis === 'x' ? 'w' : 'h'; if (n.props[k] === v) return; mutate(() => { n.props[k] = v; const f = find(n.id); if ((f.parent?.type === 'Row') === (k === 'w')) delete n.props.weight; }, 'resize' + n.id + k, { keepLeft: true }); return; }
  if (!drag) return;
  if (!drag.on && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
  drag.on = true; const el = drag.el; el.classList.add('dragging');
  const pe = el.parentElement, horiz = drag.parent.type === 'Row', sibs = [...pe.children].filter(c => c.dataset.id && c !== el);
  let idx = sibs.length; for (let i = 0; i < sibs.length; i++) { const r = sibs[i].getBoundingClientRect(), mid = horiz ? r.left + r.width / 2 : r.top + r.height / 2; if ((horiz ? e.clientX : e.clientY) < mid) { idx = i; break; } }
  drag.idx = idx;
  const vr = viewport.getBoundingClientRect(), pr = pe.getBoundingClientRect(), ox = viewport.scrollLeft - vr.left, oy = viewport.scrollTop - vr.top;
  let pos; if (!sibs.length) pos = horiz ? pr.left : pr.top; else if (idx < sibs.length) { const r = sibs[idx].getBoundingClientRect(); pos = (horiz ? r.left : r.top) - 3; } else { const r = sibs[sibs.length - 1].getBoundingClientRect(); pos = (horiz ? r.right : r.bottom) + 1; }
  dropInd = horiz ? { x: pos + ox, y: pr.top + oy, w: 3, h: pr.height } : { x: pr.left + ox, y: pos + oy, w: pr.width, h: 3 };
  drawOverlay();
});
window.addEventListener('pointerup', () => {
  if (resizing) { resizing = null; return; }
  if (!drag) return; const dd = drag; drag = null; dropInd = null; dd.el.classList.remove('dragging');
  if (dd.on && dd.idx != null) { const f = find(dd.id), a = f.parent.children, from = a.indexOf(f.node); if (dd.idx === from) return drawOverlay(); mutate(() => { a.splice(from, 1); a.splice(dd.idx, 0, f.node); }); toast(`Moved ${f.node.name}`); }
  else drawOverlay();
});
viewport.addEventListener('pointerover', e => { if (!project || st.tool === 'play' || drag || st.view === 'flow') return; const el = e.target.closest('#content [data-id]'); const id = el?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
viewport.addEventListener('pointerleave', () => { if (st.hover) { st.hover = null; drawOverlay(); } });
viewport.addEventListener('scroll', () => drawOverlay(), { passive: true });
viewport.addEventListener('click', e => {
  if (!project || st.tool !== 'play' || animating) return; const el = e.target.closest('#content .clickable'); if (!el) return; const f = find(el.dataset.id); if (!f) return;
  const p = f.node.props;
  if ((f.node.type === 'TextField' || f.node.type === 'Switch') && p.change?.event) { fireEvent({ kind: 'event', event: p.change.event, arg: f.node.type === 'Switch' ? 'true' : '"…"' }, scopes[el.dataset.scope] || scopes.s0); return renderInspector(); }
  runActions(p.actions || [], scopes[el.dataset.scope] || scopes.s0, f.node.name);
});
viewport.addEventListener('wheel', e => { if (!project || !(e.ctrlKey || e.metaKey) || st.view === 'flow') return; e.preventDefault(); st.zoom = clamp(st.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 0.3, 2); renderCanvas(); }, { passive: false });

/* ---------- code ---------- */
codeView.addEventListener('click', e => { const l = e.target.closest('.cl[data-id]'); if (!l) return; if (st.tool === 'play') setTool('design'); select(l.dataset.id, st.inst); });
codeView.addEventListener('mousemove', e => { const l = e.target.closest('.cl[data-id]'); const id = l?.dataset.id || null; if (id !== st.hover) { st.hover = id; drawOverlay(); } });
codeView.addEventListener('mouseleave', () => { st.hover = null; drawOverlay(); });
let vmT;
function ensureCaret() { const line = vmTa.value.slice(0, vmTa.selectionStart).split('\n').length - 1, y = 8 + line * 20; if (y < vmScroll.scrollTop + 8) vmScroll.scrollTop = y - 8; else if (y + 28 > vmScroll.scrollTop + vmScroll.clientHeight) vmScroll.scrollTop = y + 28 - vmScroll.clientHeight; }
vmTa.addEventListener('input', () => {
  const id = vmTa.dataset.vm; if (!id || !project) return;
  sources[id] = vmTa.value; markDirty(); if (!vmDirty.has(id)) { vmDirty.add(id); renderCode(); } renderVmPre(); ensureCaret();
  clearTimeout(vmT); vmT = setTimeout(() => {
    const before = (models[id]?.events || []).map(e => e.name).join(); reparse(); computeProblems(); renderVmPre(); renderInspector(); if (st.leftTab === 'project') renderProjectPanel();
    const after = models[id].events.map(e => e.name).join(); if (before !== after) logLine('sys', `Indexed ${esc(models[id].iface || project.viewModels[id].name)}: ${models[id].events.map(e => esc(e.name)).join(', ')}`);
    pulseSync(`Indexing ${project.viewModels[id].name}.kt…`);
  }, 320);
});
vmTa.addEventListener('keyup', ensureCaret); vmTa.addEventListener('click', ensureCaret);
function insertText(t) { if (!document.execCommand('insertText', false, t)) { vmTa.setRangeText(t, vmTa.selectionStart, vmTa.selectionEnd, 'end'); vmTa.dispatchEvent(new Event('input')); } }
vmTa.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); insertText('    '); }
  else if (e.key === 'Enter' && !e.isComposing) { const v = vmTa.value, s = vmTa.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, cur = v.slice(ls, s); let ind = cur.match(/^\s*/)[0]; if (/[{(]\s*$/.test(cur)) ind += '    '; e.preventDefault(); insertText('\n' + ind); }
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if (!project) return;
  const typing = isTyping(), mod = e.metaKey || e.ctrlKey;
  if (!bridge) {
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
    if (mod && e.key.toLowerCase() === 'd' && st.sel && !typing) { e.preventDefault(); return cmd('dup'); }
  }
  if (typing) return;
  if (e.key === 'Escape') { if (st.tool === 'play') return setTool('design'); const f = find(st.sel); return f?.parent ? select(f.parent.id, st.inst) : select(null); }
  if (st.tool === 'play') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel) { e.preventDefault(); cmd('del'); }
  else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && st.sel) { e.preventDefault(); cmd(e.key === 'ArrowUp' ? 'up' : 'down'); }
  else if (e.key.toLowerCase() === 'p' && !mod && !e.altKey) setTool('play');
});

/* ---------- splitter & resize ---------- */
$('#splitter').addEventListener('pointerdown', e => {
  e.preventDefault(); const ws = $('#workspace'), r = ws.getBoundingClientRect();
  const mv = ev => { const w = clamp(ev.clientX - r.left, 560, r.width - 340); ws.style.setProperty('--split', w + 'px'); renderCanvas(); };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
});
let roT; new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(() => { if (!project) return; if (st.view === 'flow') renderFlow(); else renderCanvas(); }, 40); }).observe(viewport);

/* ---------- boot ---------- */
if (bridge) {
  document.documentElement.classList.add('desktop');
  bridge.onMenu((c, arg) => {
    if (!project && !['new', 'settings', 'shortcuts'].includes(c)) return;
    if (c === 'insert') return insert(arg);
    if (c === 'screen-next') { const i = order().indexOf(st.screen); return openScreen(order()[(i + arg + order().length) % order().length]); }
    MENU[c]?.();
  });
  bridge.onLoadProject(p => loadProject(p));
  bridge.onWelcome(d => { recents = d.recents || []; toolStatus = d.status || null; project = null; showWelcome(true); });
  bridge.onRecents(r => { recents = r; if (!project) renderWelcome(); });
  bridge.onRun(onRunEvent);
  bridge.onFullscreen(on => document.documentElement.classList.toggle('fullscreen', on));
  window.addEventListener('focus', async () => {
    if (!project) return;
    const changed = await bridge.checkExternal();
    Object.entries(changed || {}).forEach(([id, src]) => {
      if (vmDirty.has(id)) { toast(`${project.viewModels[id].name}.kt changed on disk. Your unsaved edits in Facet are kept.`); return; }
      sources[id] = src; if (vmTa.dataset.vm === id) vmTa.value = src; logLine('sys', `Reloaded ${esc(project.viewModels[id].name)}.kt from disk`);
    });
    if (Object.keys(changed || {}).length) { reparse(); refresh(); }
    refreshDevices();
  });
  setInterval(() => { if (project && document.hasFocus() && !['booting', 'building', 'installing', 'launching'].includes(runState.phase)) refreshDevices(); }, 6000);
  bridge.ready();
} else {
  const s = C.sampleProject('Brew', 'com.example.brew');
  loadProject({ project: s.project, sources: s.sources });
  logLine('sys', 'Browser preview: open the Facet Mac app to create projects and run them on devices.');
}
