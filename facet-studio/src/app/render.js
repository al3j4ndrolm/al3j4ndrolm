'use strict';
/* Facet editor — canvas renderer: node tree → DOM that approximates what Compose draws. */

function layoutCss(n, parent, css) {
  const p = n.props;
  if (!parent) { css.push('width:100%', 'height:100%'); return; }
  const pt = parent.type;
  if (pt === 'Box') { css.push('grid-area:1/1'); if (p.w === 'fill') css.push('width:100%'); else if (typeof p.w === 'number') css.push(`width:${p.w}px`); if (p.h === 'fill') css.push('height:100%'); else if (typeof p.h === 'number') css.push(`height:${p.h}px`); return; }
  const col = pt !== 'Row'; const main = col ? 'h' : 'w', cross = col ? 'w' : 'h', mainCss = col ? 'height' : 'width', crossCss = col ? 'width' : 'height';
  if (p.weight) css.push(`flex:${p.weight} 1 0`, `min-${mainCss}:0`);
  else if (p[main] === 'fill') css.push('flex:1 1 0', `min-${mainCss}:0`);
  else { css.push(n.type === 'Text' && !col ? 'flex-shrink:1' : (n.type === 'List' ? 'flex-shrink:1;min-height:0' : 'flex-shrink:0')); if (typeof p[main] === 'number') css.push(`${mainCss}:${p[main]}px`); }
  if (p[cross] === 'fill') css.push('align-self:stretch'); else if (typeof p[cross] === 'number') css.push(`${crossCss}:${p[cross]}px`);
  if (n.type === 'Divider' && p[cross] == null && col) css.push('align-self:stretch');
}
function flexCss(n, css) {
  const p = n.props, J = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' }, A = { start: 'flex-start', center: 'center', end: 'flex-end' };
  if (p.gap) css.push(`gap:${p.gap}px`);
  css.push(`justify-content:${J[p.arr || 'start']}`, `align-items:${A[p.align || 'start']}`);
}
function imagePlaceholder(seed) {
  const h = hash(seed || 'x') % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${h} 60% 82% / .9), transparent 55%), linear-gradient(135deg, hsl(${h} 45% 70%), hsl(${(h + 40) % 360} 40% 48%))`;
}
function renderNode(n, scope, parent, inst, design, sk) {
  const p = n.props, css = [], cls = ['m', 'm-' + n.type];
  layoutCss(n, parent, css);
  if (p.radius && !['Button', 'TextField', 'Switch', 'Divider'].includes(n.type)) css.push(`border-radius:${p.radius}px`);
  if (p.bg && !['Button', 'TextField', 'Switch', 'Divider'].includes(n.type)) { css.push(`background:var(--m-${p.bg})`); if (C.ON[p.bg]) css.push(`color:var(--m-${C.ON[p.bg]})`); }
  if (p.pad && (p.pad.x || p.pad.y) && !['Button', 'Divider'].includes(n.type)) css.push(`padding:${p.pad.y || 0}px ${p.pad.x || 0}px`);
  if ((p.actions || []).length || (p.change?.event && ['TextField', 'Switch'].includes(n.type))) cls.push('clickable');
  let attrs = `data-id="${n.id}" data-inst="${inst}" data-scope="${sk}"`;
  if (p.animateItem && parent?.type === 'List') { attrs += ' data-animitem'; css.push(`--i:${inst}`); }
  const kids = () => n.children.length ? n.children.map(c => renderNode(c, scope, n, inst, design, sk)).join('') : (design ? `<div class="m-empty">Empty ${n.type} · insert a component</div>` : '');
  let inner = '';
  switch (n.type) {
    case 'Column': case 'Card': css.push('display:flex', 'flex-direction:column'); flexCss(n, css); if (p.scroll) css.push('overflow-y:auto'); inner = kids(); break;
    case 'Row': css.push('display:flex', 'flex-direction:row'); flexCss(n, css); inner = kids(); break;
    case 'Box': { css.push('display:grid'); let r = 0, c = 0; C.BOXAL.forEach((row, ri) => row.forEach((v, ci) => { if (v === (p.balign || 'TopStart')) { r = ri; c = ci; } })); const S = ['start', 'center', 'end']; css.push(`place-items:${S[r]} ${S[c]}`); inner = kids(); break; }
    case 'List': {
      css.push('display:flex', 'flex-direction:column', 'overflow:hidden'); flexCss(n, css);
      const items = resolve(p.items || '', scope);
      if (!Array.isArray(items) || !items.length) inner = design ? `<div class="m-empty">items(${esc(p.items)}) is empty in the preview data</div>` : '';
      else inner = items.map((it, i) => { const k = 's' + (++scopeSeq); scopes[k] = { ...scope, [p.item]: it }; return n.children.map(c => renderNode(c, scopes[k], n, i, design, k)).join(''); }).join('');
      break;
    }
    case 'Text': cls.push('ts-' + (p.style || 'bodyLarge')); if (p.color) css.push(`color:var(--m-${p.color})`); inner = esc(fmt(p.text, scope)); break;
    case 'Button': cls.push('m-btn', 'btn-' + (p.variant || 'filled'), 'ts-labelLarge'); if (p.w === 'fill') css.push('display:flex'); inner = `<span>${esc(fmt(p.text, scope))}</span>`; break;
    case 'IconButton': { cls.push('m-iconbtn'); const b = p.badge ? fmt(p.badge, scope) : ''; inner = mi(p.icon) + (b && b !== '0' ? `<span class="m-badge">${esc(b)}</span>` : ''); break; }
    case 'Image': {
      const src = p.src ? resolve(p.src, scope) : null, owner = p.src ? resolve(p.src.split('.').slice(0, -1).join('.'), scope) : null;
      css.push(`background:${imagePlaceholder(src || owner?.id || owner?.name || n.id)}`);
      if (p.w == null) css.push('width:96px'); if (p.h == null) css.push('height:96px');
      break;
    }
    case 'TextField': {
      cls.push('m-field'); const v = p.value ? fmt(p.value.startsWith('{') ? p.value : `{${p.value}}`, scope) : '';
      inner = `<span class="m-field-l ts-bodySmall">${esc(fmt(p.label || '', scope))}</span><span class="m-field-v ts-bodyLarge">${esc(v) || '&nbsp;'}</span>`; break;
    }
    case 'Switch': { const v = p.checked ? resolve(p.checked.replace(/^\{|\}$/g, ''), scope) : false; cls.push('m-switch'); if (v) cls.push('on'); inner = '<i></i>'; break; }
    case 'Divider': cls.push('m-divider'); break;
    case 'Spacer': if (!p.weight && p.h == null && p.w == null) css.push('height:8px'); break;
  }
  return `<div class="${cls.join(' ')}" ${attrs} style="${css.join(';')}">${inner}</div>`;
}
function screenHTML(key, design) { scopes.s0 = { state: previewOf(key) }; return renderNode(project.screens[key].root, scopes.s0, null, 0, design, 's0'); }
const sbar = () => `<div class="sbar"><span>9:41</span><svg width="46" height="12" viewBox="0 0 46 12" aria-hidden="true"><path d="M1 11h2V8H1zm4 0h2V6H5zm4 0h2V4H9zm4 0h2V1h-2z" fill="currentColor"/><path d="M24 3.5a9 9 0 0 1 6 2.3l-1.3 1.4A7 7 0 0 0 24 5.5a7 7 0 0 0-4.7 1.7L18 5.8a9 9 0 0 1 6-2.3zm0 4a5 5 0 0 1 3.2 1.2L24 11.5l-3.2-2.8A5 5 0 0 1 24 7.5z" fill="currentColor"/><rect x="34.5" y="2.5" width="9" height="7" rx="1.5" fill="none" stroke="currentColor"/><rect x="36" y="4" width="5" height="4" rx=".5" fill="currentColor"/><rect x="44" y="5" width="1.2" height="2" fill="currentColor"/></svg></div>`;

function renderCanvas() {
  if (animating || !project) return;
  if (st.view === 'flow' && st.tool !== 'play') return renderFlow();
  const D = DEVICES[st.device], fw = D.w + 20, fh = D.h + 20;
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const z = st.zoom === 'fit' ? clamp(Math.min((vw - 80) / fw, (vh - 122) / fh), 0.3, 1.25) : st.zoom;
  st.z = z; scopes = {}; scopeSeq = 0;
  stage.style.width = fw * z + 'px'; stage.style.height = fh * z + 'px';
  stage.innerHTML = `<div class="device" style="width:${fw}px;height:${fh}px;transform:scale(${z})"><div class="screen ${st.tool === 'play' ? 'play' : 'design'}" style="width:${D.w}px;height:${D.h}px">${sbar()}<div class="content" id="content"><div class="layer">${screenHTML(st.screen, st.tool !== 'play')}</div></div><div class="gbar"><span></span></div></div></div>`;
  renderCanvasTools(); renderHint(); drawOverlay();
}
function rerenderTop() { const l = $('#content .layer:last-child'); if (l) l.innerHTML = screenHTML(st.screen, false); }

/* ---------- selection overlay ---------- */
let drag = null, dropInd = null, resizing = null;
function drawOverlay() {
  if (!project || st.tool === 'play' || st.view === 'flow') { ov.innerHTML = ''; return; }
  const content = $('#content'); if (!content) { ov.innerHTML = ''; return; }
  const vr = viewport.getBoundingClientRect(), sl = viewport.scrollLeft, stp = viewport.scrollTop;
  const R = el => { const r = el.getBoundingClientRect(); return { x: r.left - vr.left + sl, y: r.top - vr.top + stp, w: r.width, h: r.height }; };
  const box = (r, c, inner = '') => `<div class="ov-box ${c}" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px">${inner}</div>`;
  let h = '';
  if (st.hover && st.hover !== st.sel) { const el = content.querySelector(`[data-id="${st.hover}"]`); if (el) h += box(R(el), 'ov-hover'); }
  const f = find(st.sel);
  if (f && f.screen === st.screen) {
    const els = $$(`[data-id="${st.sel}"]`, content);
    if (f.parent) { const pe = content.querySelector(`[data-id="${f.parent.id}"][data-inst="${st.inst}"]`) || content.querySelector(`[data-id="${f.parent.id}"]`); if (pe) h += box(R(pe), 'ov-parent'); }
    els.forEach(el => { if (+el.dataset.inst !== st.inst) h += box(R(el), 'ov-inst'); });
    const main = els.find(el => +el.dataset.inst === st.inst) || els[0];
    if (main) {
      const r = R(main), z = st.z, p = f.node.props; let inner = '';
      if (p.pad && (p.pad.x || p.pad.y) && f.node.type !== 'Button') { const px = (p.pad.x || 0) * z, py = (p.pad.y || 0) * z; inner += `<i class="ov-pad" style="left:0;top:0;right:0;height:${py}px"></i><i class="ov-pad" style="left:0;bottom:0;right:0;height:${py}px"></i><i class="ov-pad" style="left:0;top:${py}px;bottom:${py}px;width:${px}px"></i><i class="ov-pad" style="right:0;top:${py}px;bottom:${py}px;width:${px}px"></i>`; }
      inner += ['tl', 'tr', 'bl', 'br'].map(c => `<i class="ov-h ${c}"></i>`).join('');
      if (f.parent) inner += `<i class="ov-res ex" data-axis="x" title="Drag to set a fixed width"></i><i class="ov-res ey" data-axis="y" title="Drag to set a fixed height"></i>`;
      inner += `<span class="ov-tag">${esc(f.node.name)}${els.length > 1 ? ` · ×${els.length}` : ''}</span><span class="ov-size">${Math.round(r.w / z)} × ${Math.round(r.h / z)}</span>`;
      h += box(r, 'ov-sel', inner);
    }
  }
  if (dropInd) h += `<div class="ov-drop" style="left:${dropInd.x}px;top:${dropInd.y}px;width:${dropInd.w}px;height:${dropInd.h}px"></div>`;
  ov.innerHTML = h;
}

/* ---------- flow view ---------- */
function renderFlow() {
  const D = DEVICES[st.device], n = order().length; scopes = {}; scopeSeq = 0;
  const fs = clamp(Math.min((viewport.clientWidth - 80 - 90 * (n - 1)) / (n * D.w), (viewport.clientHeight - 260) / D.h), 0.22, 0.6);
  stage.style.width = ''; stage.style.height = '';
  stage.innerHTML = `<div class="flow" id="flow"><svg class="flow-svg" id="flowSvg"></svg>${order().map(k => { const s = scr(k); return `<div class="ab" data-screen="${k}" title="Open ${esc(info(k).fn)}"><div class="ab-label">${project.start === k ? '<span class="start">Start</span>' : ''}<b>${esc(s.name)}</b><span>Route.${esc(s.name)}</span></div><div class="ab-frame" style="width:${D.w * fs}px;height:${D.h * fs}px"><div class="ab-scale" style="width:${D.w}px;height:${D.h}px;transform:scale(${fs})">${sbar()}<div class="content" style="flex:1;position:relative;overflow:hidden"><div class="layer">${screenHTML(k, false)}</div></div><div class="gbar"><span></span></div></div></div></div>`; }).join('')}</div>`;
  ov.innerHTML = ''; renderCanvasTools(); renderHint();
  requestAnimationFrame(drawFlowArrows);
}
function drawFlowArrows() {
  const flow = $('#flow'), svg = $('#flowSvg'); if (!flow || !svg) return;
  const fr = flow.getBoundingClientRect(); svg.setAttribute('width', flow.scrollWidth); svg.setAttribute('height', flow.scrollHeight);
  const rel = r => ({ x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height });
  const NS = 'http://www.w3.org/2000/svg'; svg.innerHTML = '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>';
  const incoming = {}, labels = [];
  order().forEach((k, si) => C.walk(scr(k).root, n => (n.props.actions || []).forEach(a => {
    if (a.kind !== 'navigate' || !project.screens[a.to] || a.to === k) return;
    const src = flow.querySelector(`.ab[data-screen="${k}"] [data-id="${n.id}"]`), dst = flow.querySelector(`.ab[data-screen="${a.to}"] .ab-frame`); if (!src || !dst) return;
    src.classList.add('flow-src');
    const s = rel(src.getBoundingClientRect()), d = rel(dst.getBoundingClientRect()), ti = order().indexOf(a.to); incoming[a.to] = (incoming[a.to] || 0) + 1;
    let dpath, x1, y1, back = false;
    if (ti > si) { x1 = s.x + s.w; y1 = s.y + s.h / 2; const x2 = d.x - 4, y2 = d.y + Math.min(40 + incoming[a.to] * 34, d.h / 2), dx = Math.max(40, (x2 - x1) / 2); dpath = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`; }
    else { back = true; x1 = s.x + s.w / 2; y1 = s.y + s.h; const x2 = d.x + d.w / 2, y2 = d.y + d.h + 4, by = Math.max(y1, y2) + 70; dpath = `M${x1} ${y1} C${x1} ${by}, ${x2} ${by}, ${x2} ${y2}`; }
    const path = document.createElementNS(NS, 'path'); path.setAttribute('d', dpath); path.setAttribute('class', 'fa' + (back ? ' back' : '')); path.setAttribute('marker-end', 'url(#ah)'); svg.appendChild(path);
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('cx', x1); dot.setAttribute('cy', y1); dot.setAttribute('r', 3.5); dot.setAttribute('class', 'fd'); svg.appendChild(dot);
    const e = project.screens[a.to].enter; labels.push({ path, text: `${C.TRANS[e.type]} · ${e.ease === 'Spring' ? 'spring' : e.dur + 'ms'}` });
  })));
  labels.forEach(({ path, text }) => {
    const L = path.getTotalLength(), pt = path.getPointAtLength(L / 2), g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'fl');
    const t = document.createElementNS(NS, 'text'); t.textContent = text; t.setAttribute('x', pt.x); t.setAttribute('y', pt.y + 3.5); t.setAttribute('text-anchor', 'middle');
    const r = document.createElementNS(NS, 'rect'); g.appendChild(r); g.appendChild(t); svg.appendChild(g);
    const w = t.getComputedTextLength() + 14; r.setAttribute('x', pt.x - w / 2); r.setAttribute('y', pt.y - 9); r.setAttribute('width', w); r.setAttribute('height', 18); r.setAttribute('rx', 9);
  });
}
