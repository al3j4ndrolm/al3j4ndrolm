'use strict';
/* Facet editor — desktop integration: projects on disk, welcome, wizard, settings, running on devices, menus. */
const bridge = window.facet || null;

function markDirty() { if (!dirty) { dirty = true; bridge?.setDirty(true); renderProj(); pulseSync(); } }
function setClean() { dirty = false; vmDirty.clear(); bridge?.setDirty(false); renderProj(); if (project) renderCode(); }
function renderProj() { const el = $('#proj'); if (!el || !project) return; el.innerHTML = `${esc(project.app.name)}${dirty ? ' <span class="ed">— Edited</span>' : ''}`; el.title = projectDir || ''; }

/* ---------- loading ---------- */
function loadProject(payload) {
  const p = payload.project, errs = C.validateProject(p);
  if (errs.length) { toast(errs.join(' ')); return false; }
  project = p; sources = { ...payload.sources }; projectDir = payload.dir || null; reparse();
  uid = Math.max(uid, C.maxId(project));
  undoStack.length = 0; redoStack.length = 0; lastKey = null; Object.keys(codeCache).forEach(k => delete codeCache[k]); buildProblems = [];
  Object.assign(st, { sel: null, screen: project.start, view: 'screen', tool: 'design', file: 'screen:' + project.start, previewVm: null });
  navStack = [project.start]; vmTa.dataset.vm = '';
  showWelcome(false); document.title = `${project.app.name} — Facet`;
  refresh(); setClean();
  logLine('sys', `Opened ${esc(project.app.name)}${projectDir ? ` from ${esc(projectDir)}` : ''}`);
  if (bridge) refreshDevices();
  return true;
}
async function saveProject() {
  if (!project) return false;
  if (!bridge) { toast('Saving needs the Facet desktop app'); return false; }
  const r = await bridge.saveProject({ project, sources });
  if (r?.ok) { setClean(); pulseSync('Saved to disk'); if (r.removed?.length) logLine('sys', `Removed ${r.removed.length} generated file(s) that no longer exist in the design`); return true; }
  toast(`Couldn’t save: ${r?.error || 'unknown error'}`); return false;
}

/* ---------- modals ---------- */
function openModal(id, html) { const m = $('#' + id); m.querySelector('.modal-card').innerHTML = html; m.hidden = false; const f = m.querySelector('[autofocus]') || m.querySelector('input,button'); f?.focus(); return m; }
function closeModal(id) { const m = $('#' + id); if (m) m.hidden = true; }
document.addEventListener('click', e => { const m = e.target.closest('.modal'); if (!m) return; if (e.target === m || e.target.closest('[data-close-modal]')) { if (m.id === 'ask' && askResolve) { askResolve(null); askResolve = null; } m.hidden = true; } });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const m = $$('.modal').find(x => !x.hidden); if (!m) return; e.stopImmediatePropagation(); if (m.id === 'ask' && askResolve) { askResolve(null); askResolve = null; } m.hidden = true; }, true);
let askResolve = null;
function askText({ title, label, value = '', placeholder = '', hint = '', validate }) {
  return new Promise(res => {
    askResolve = res;
    const m = openModal('ask', `<div class="modal-head"><h2>${esc(title)}</h2><button class="tbtn icon" data-close-modal aria-label="Close">${ui('x', 13)}</button></div>
      <form class="form" id="askForm"><label class="field"><span>${esc(label)}</span><input class="txtin" id="askInput" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autofocus></label>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}<div class="form-err" id="askErr"></div>
      <div class="form-actions"><button type="button" class="tbtn" data-close-modal>Cancel</button><button type="submit" class="tbtn pri">Create</button></div></form>`);
    const input = m.querySelector('#askInput'), err = m.querySelector('#askErr');
    input.addEventListener('input', () => { err.textContent = ''; });
    m.querySelector('#askForm').addEventListener('submit', ev => { ev.preventDefault(); const v = input.value.trim(); const msg = validate ? validate(v) : ''; if (msg) { err.textContent = msg; return; } m.hidden = true; askResolve = null; res(v); });
  });
}

/* ---------- welcome ---------- */
let toolStatus = null, recents = [];
function showWelcome(on) { $('#welcome').hidden = !on; appEl.hidden = on; if (on) renderWelcome(); }
function statusCard() {
  if (!toolStatus) return `<div class="tcard"><span class="tcard-i">${ui('gear', 14)}</span><div><b>Checking Android tools…</b></div></div>`;
  const ok = !toolStatus.problems.length;
  return `<div class="tcard ${ok ? 'ok' : 'warn'}"><span class="tcard-i">${ui(ok ? 'check' : 'warn', 14)}</span><div><b>${ok ? 'Ready to build and run on devices' : 'Android tools need setup to run on devices'}</b>
    <span>${toolStatus.sdk ? `SDK ${esc(toolStatus.sdk)}` : 'No Android SDK'} · ${toolStatus.jdk ? `JDK ${toolStatus.javaVersion}` : 'No JDK'}</span>${toolStatus.problems.map(p => `<span class="tcard-p">${esc(p)}</span>`).join('')}</div><button class="tbtn" data-cmd="settings">${ui('gear', 13)}Settings</button></div>`;
}
function renderWelcome() {
  $('#welcome').innerHTML = `<div class="wl"><div class="wl-brand"><svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true"><rect class="a" x="1" y="1" width="22" height="22" rx="7"/><path class="b" d="M12 1h4a7 7 0 0 1 7 7v4H12z"/><path class="c" d="M8 7h6v2.4H10.6V11H13v2.3h-2.4V17H8z"/></svg><div><h1>Facet</h1><p>Design Compose screens, wire them to your ViewModels, run them on Android.</p></div></div>
    <div class="wl-actions"><button class="wl-btn pri" data-welcome="new">${ui('plus', 18)}<span><b>New project</b><small>An Android Studio project with Facet design files</small></span></button><button class="wl-btn" data-welcome="open">${ui('folder', 18)}<span><b>Open…</b><small>A folder that contains facet.json</small></span></button></div>
    <div class="wl-recent"><h3>Recent</h3>${recents.length ? recents.map(r => `<div class="wl-r"><button data-recent="${esc(r.dir)}"><b>${esc(r.name)}</b><span>${esc(r.dir)}</span></button><button class="act-x" data-forget="${esc(r.dir)}" title="Remove from list" aria-label="Remove from list">${ui('x', 12)}</button></div>`).join('') : '<p class="hint">Projects you open appear here.</p>'}</div>
    ${statusCard()}<p class="wl-foot">Facet ${esc(bridge?.version || '')} · AGP ${C.VERSIONS.agp} · Kotlin ${C.VERSIONS.kotlin} · Compose BOM ${C.VERSIONS.composeBom}</p></div>`;
}

/* ---------- new project wizard ---------- */
async function openWizard() {
  const defaults = await bridge.defaults();
  let pkgEdited = false;
  const m = openModal('wizard', `<div class="modal-head"><h2>New project</h2><button class="tbtn icon" data-close-modal aria-label="Close">${ui('x', 13)}</button></div>
    <form class="form" id="wizForm">
      <div class="tpl-grid"><label class="tpl"><input type="radio" name="tpl" value="blank" checked><span><b>Empty app</b><small>One screen, one ViewModel with a counter</small></span></label><label class="tpl"><input type="radio" name="tpl" value="sample"><span><b>Coffee shop sample</b><small>3 screens, lists, cart, navigation and transitions</small></span></label></div>
      <label class="field"><span>App name</span><input class="txtin" id="wzName" value="My App" autocomplete="off" autofocus></label>
      <label class="field"><span>Package name</span><input class="txtin mono" id="wzPkg" value="com.example.myapp" autocomplete="off" spellcheck="false"></label>
      <label class="field"><span>Save location</span><div class="pickrow"><input class="txtin mono" id="wzDir" value="${esc(defaults.projectsDir)}" spellcheck="false"><button type="button" class="tbtn" id="wzBrowse">${ui('folder', 13)}Choose…</button></div></label>
      <p class="hint" id="wzWhere"></p><div class="form-err" id="wzErr"></div>
      <div class="form-actions"><button type="button" class="tbtn" data-close-modal>Cancel</button><button type="submit" class="tbtn pri" id="wzGo">Create project</button></div>
    </form>`);
  const name = m.querySelector('#wzName'), pkg = m.querySelector('#wzPkg'), dir = m.querySelector('#wzDir'), where = m.querySelector('#wzWhere'), err = m.querySelector('#wzErr');
  const folder = () => C.pascal(name.value) || 'MyApp';
  const upd = () => { where.textContent = `Creates ${dir.value.replace(/\/$/, '')}/${folder()}`; err.textContent = ''; };
  name.addEventListener('input', () => { if (!pkgEdited) pkg.value = `com.example.${(C.pascal(name.value) || 'myapp').toLowerCase()}`; upd(); });
  pkg.addEventListener('input', () => { pkgEdited = true; upd(); }); dir.addEventListener('input', upd); upd();
  m.querySelectorAll('input[name=tpl]').forEach(r => r.addEventListener('change', () => { if (r.checked && r.value === 'sample' && name.value === 'My App') { name.value = 'Brew'; if (!pkgEdited) pkg.value = 'com.example.brew'; upd(); } }));
  m.querySelector('#wzBrowse').addEventListener('click', async () => { const d = await bridge.pickFolder({ title: 'Choose where to save the project', defaultPath: dir.value }); if (d) { dir.value = d; upd(); } });
  m.querySelector('#wizForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!name.value.trim()) { err.textContent = 'Give the app a name.'; return; }
    if (!C.isPackageName(pkg.value.trim())) { err.textContent = 'Use a package name like com.example.myapp: lowercase, at least two parts, no Kotlin keywords.'; return; }
    const go = m.querySelector('#wzGo'); go.disabled = true; go.textContent = 'Creating…';
    const r = await bridge.createProject({ template: m.querySelector('input[name=tpl]:checked').value, name: name.value.trim(), packageName: pkg.value.trim(), parent: dir.value.trim(), folder: folder() });
    go.disabled = false; go.textContent = 'Create project';
    if (!r?.ok) { err.textContent = r?.error || 'The project could not be created.'; return; }
    m.hidden = true;
  });
}

/* ---------- settings ---------- */
async function openSettings() {
  const s = await bridge.getSettings(); toolStatus = await bridge.toolStatus();
  const row = (k, label, val, detected, hint) => `<label class="field"><span>${label}</span><div class="pickrow"><input class="txtin mono" data-setting="${k}" value="${esc(val || '')}" placeholder="${esc(detected || 'Not found')}" spellcheck="false"><button type="button" class="tbtn" data-browse="${k}">${ui('folder', 13)}Choose…</button></div><small class="hint">${hint}</small></label>`;
  const m = openModal('settings', `<div class="modal-head"><h2>Settings</h2><button class="tbtn icon" data-close-modal aria-label="Close">${ui('x', 13)}</button></div>
    <form class="form" id="setForm">${statusCard()}
      ${row('sdkPath', 'Android SDK folder', s.sdkPath, toolStatus.sdk, `Leave empty to auto-detect (ANDROID_HOME or ~/Library/Android/sdk). ${toolStatus.platforms.length ? 'Installed: ' + esc(toolStatus.platforms.join(', ')) : ''}`)}
      ${row('jdkPath', 'JDK folder (17 or newer)', s.jdkPath, toolStatus.jdk, 'Leave empty to use JAVA_HOME or the JDK that ships with Android Studio.')}
      <label class="field"><span>New projects folder</span><div class="pickrow"><input class="txtin mono" data-setting="projectsDir" value="${esc(s.projectsDir || '')}" spellcheck="false"><button type="button" class="tbtn" data-browse="projectsDir">${ui('folder', 13)}Choose…</button></div></label>
      <div class="form-actions"><button type="button" class="tbtn" data-close-modal>Cancel</button><button type="submit" class="tbtn pri">Save</button></div></form>`);
  m.querySelectorAll('[data-browse]').forEach(b => b.addEventListener('click', async () => { const inp = m.querySelector(`[data-setting="${b.dataset.browse}"]`); const d = await bridge.pickFolder({ title: 'Choose a folder', defaultPath: inp.value || inp.placeholder }); if (d) inp.value = d; }));
  m.querySelector('#setForm').addEventListener('submit', async ev => {
    ev.preventDefault(); const next = {}; m.querySelectorAll('[data-setting]').forEach(i => { next[i.dataset.setting] = i.value.trim(); });
    await bridge.setSettings(next); toolStatus = await bridge.toolStatus(); m.hidden = true;
    toast(toolStatus.problems.length ? toolStatus.problems[0] : 'Android tools ready'); if (!project) renderWelcome(); else refreshDevices();
  });
}

/* ---------- run on device ---------- */
let devices = { devices: [], avds: [] }, runState = { phase: 'idle' }, runTarget = null;
async function refreshDevices() {
  if (!bridge || !project) return;
  devices = await bridge.devices();
  const opts = runOptions();
  if (!opts.some(o => o.value === runTarget && !o.disabled)) runTarget = (opts.find(o => o.value.startsWith('dev:') && !o.disabled) || opts.find(o => o.value.startsWith('avd:')) || opts[opts.length - 1]).value;
  renderRunBar();
}
function runOptions() {
  const o = [];
  devices.devices.forEach(d => o.push({ value: 'dev:' + d.serial, label: `${d.name}${d.kind === 'emulator' ? '' : ' (USB)'}${d.state !== 'device' ? ` · ${d.state}` : ''}`, disabled: d.state !== 'device', group: 'Connected' }));
  const running = new Set(devices.devices.map(d => d.name.replace(/ /g, '_')));
  devices.avds.filter(a => !running.has(a)).forEach(a => o.push({ value: 'avd:' + a, label: `${a.replace(/_/g, ' ')}`, group: 'Start an emulator' }));
  o.push({ value: 'apk', label: 'Build APK only', group: 'Other' });
  return o;
}
const RUN_LABEL = { idle: 'Run', booting: 'Starting emulator…', building: 'Building…', installing: 'Installing…', launching: 'Launching…', running: 'Running', failed: 'Run', stopped: 'Run', done: 'Run' };
function renderRunBar() {
  const el = $('#runBar'); if (!el) return;
  if (!bridge || !project) { el.hidden = true; return; } el.hidden = false;
  const busy = ['booting', 'building', 'installing', 'launching'].includes(runState.phase), live = busy || runState.phase === 'running';
  const opts = runOptions(); let groups = '', g = null;
  opts.forEach(o => { if (o.group !== g) { if (g) groups += '</optgroup>'; groups += `<optgroup label="${esc(o.group)}">`; g = o.group; } groups += `<option value="${esc(o.value)}" ${o.value === runTarget ? 'selected' : ''} ${o.disabled ? 'disabled' : ''}>${esc(o.label)}</option>`; });
  el.innerHTML = `<select id="runTarget" class="dev" aria-label="Run on" ${live ? 'disabled' : ''}>${groups}</optgroup></select>
    <button class="runbtn ${busy ? 'busy' : ''} ${runState.phase === 'running' ? 'live' : ''}" data-run ${live ? 'disabled' : ''} title="Save, build with Gradle and run (⌘R)">${busy ? '<i class="spin"></i>' : ui(runTarget === 'apk' ? 'hammer' : 'play', 13)}<span>${runTarget === 'apk' && !live ? 'Build' : RUN_LABEL[runState.phase]}</span></button>
    <button class="stopbtn" data-stop ${live ? '' : 'disabled'} title="Stop (⌘.)">${ui('stop', 13)}</button>`;
}
async function runApp() {
  if (!bridge || !project) return;
  if (['booting', 'building', 'installing', 'launching', 'running'].includes(runState.phase)) return;
  const design = problems.length; if (design) logLine('warn', `Running with ${design} design problem(s). The Kotlin compiler will report anything that breaks the build.`);
  if (!(await saveProject())) return;
  buildLog.length = 0; logcatLog.length = 0; buildProblems = []; st.ctab = 'build'; runState = { phase: 'building' }; renderConsole(); renderRunBar(); renderCode();
  bridge.run({ target: runTarget || 'apk' });
}
function onRunEvent(ev) {
  switch (ev.type) {
    case 'phase': runState = { phase: ev.phase }; renderRunBar(); if (ev.phase === 'running') { st.ctab = 'logcat'; conLater(); } break;
    case 'line': buildLog.push({ text: ev.text, kind: ev.kind || '' }); if (buildLog.length > 4000) buildLog.splice(0, buildLog.length - 4000); if (st.ctab === 'build') conLater(); break;
    case 'problem': buildProblems.push(ev.problem); renderStatus(); conLater(); break;
    case 'logcat': logcatLog.push(ev.entry); if (logcatLog.length > 3000) logcatLog.splice(0, logcatLog.length - 3000); if (st.ctab === 'logcat') conLater(); break;
    case 'done':
      runState = { phase: ev.ok ? (ev.running ? 'running' : 'done') : 'failed' }; renderRunBar();
      if (!ev.ok) { st.ctab = buildProblems.length ? 'problems' : 'build'; conLater(); toast(ev.error || `Build failed with ${buildProblems.filter(p => p.sev === 'error').length} error(s)`); renderCode(); renderVmPre(); }
      else if (ev.apk) { toast('APK built'); logLine('sys', `APK: ${esc(ev.apk)}`); }
      refreshDevices(); break;
  }
}

/* ---------- menus ---------- */
const isTyping = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
const MENU = {
  undo: () => isTyping() ? document.execCommand('undo') : doUndo(),
  redo: () => isTyping() ? document.execCommand('redo') : doRedo(),
  duplicate: () => { if (!isTyping() && st.sel && st.tool === 'design') cmd('dup'); },
  delete: () => { if (!isTyping() && st.sel && st.tool === 'design') cmd('del'); },
  'mode-design': () => setMode('design'), 'mode-split': () => setMode('split'), 'mode-code': () => setMode('code'),
  flow: () => { if (st.tool === 'play') st.tool = 'design'; st.view = 'flow'; st.sel = null; refresh(); },
  'zoom-in': () => zoom('in'), 'zoom-out': () => zoom('out'), 'zoom-fit': () => zoom('fit'),
  'toggle-dark': () => { project.theme.mode = project.theme.mode === 'light' ? 'dark' : 'light'; refresh({ keepInspector: true }); toast(`Previewing the ${project.theme.mode} scheme`); },
  play: () => setTool(st.tool === 'play' ? 'design' : 'play'),
  save: () => saveProject(), 'save-and-close': async () => { if (await saveProject()) bridge.closeWindow(); },
  run: () => runApp(), stop: () => bridge?.stop(), 'new-screen': () => addScreen(), 'new-vm': () => addViewModel(),
  new: () => openWizard(), settings: () => openSettings(), reveal: () => bridge?.reveal(), studio: () => cmd('studio'),
  shortcuts: () => { $('#shortcuts').hidden = false; },
};
