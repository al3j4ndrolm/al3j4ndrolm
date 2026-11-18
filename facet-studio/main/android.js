'use strict';
// Android toolchain: finds the SDK and a JDK, lists devices and emulators, runs Gradle,
// installs and launches the app, and streams logcat. Everything uses absolute paths because
// macOS apps launched from Finder don't inherit the shell's PATH.
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');

const isMac = process.platform === 'darwin', isWin = process.platform === 'win32';
const exe = name => isWin ? `${name}.exe` : name;
const home = os.homedir();

function run(file, args, opts = {}) {
  return new Promise(resolve => {
    execFile(file, args, { timeout: opts.timeout || 15000, env: opts.env || process.env, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => resolve({ ok: !err, code: err?.code ?? 0, stdout: String(stdout || ''), stderr: String(stderr || '') }));
  });
}
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };

/* ---------- discovery ---------- */
function sdkCandidates(settings) {
  return [settings?.sdkPath, process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
    isMac && path.join(home, 'Library/Android/sdk'),
    !isMac && !isWin && path.join(home, 'Android/Sdk'),
    isWin && process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android/Sdk'),
    '/opt/android-sdk'].filter(Boolean);
}
function findSdk(settings) { return sdkCandidates(settings).find(p => isFile(path.join(p, 'platform-tools', exe('adb')))) || null; }
function jdkCandidates(settings) {
  const studio = isMac
    ? ['/Applications/Android Studio.app', path.join(home, 'Applications/Android Studio.app'), '/Applications/Android Studio Preview.app'].map(a => path.join(a, 'Contents/jbr/Contents/Home'))
    : isWin ? [process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Android/Android Studio/jbr')] : ['/opt/android-studio/jbr', path.join(home, 'android-studio/jbr')];
  return [settings?.jdkPath, process.env.JAVA_HOME, ...studio].filter(Boolean);
}
async function javaVersion(jdk) {
  const r = await run(path.join(jdk, 'bin', exe('java')), ['-version']);
  const m = (r.stderr + r.stdout).match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return 0; return m[1] === '1' ? Number(m[2]) : Number(m[1]);
}
async function findJdk(settings) {
  for (const p of jdkCandidates(settings)) if (isFile(path.join(p, 'bin', exe('java'))) && await javaVersion(p) >= 17) return p;
  if (isMac) { const r = await run('/usr/libexec/java_home', ['-v', '17+']); const p = r.stdout.trim(); if (r.ok && p && isFile(path.join(p, 'bin/java'))) return p; }
  return null;
}
async function status(settings) {
  const sdk = findSdk(settings), jdk = await findJdk(settings);
  const out = { sdk, jdk, javaVersion: jdk ? await javaVersion(jdk) : 0, platforms: [], emulator: false, problems: [] };
  if (!sdk) out.problems.push('Android SDK not found. Install Android Studio (it installs the SDK), or set the SDK folder in Settings.');
  else {
    try { out.platforms = fs.readdirSync(path.join(sdk, 'platforms')).filter(d => d.startsWith('android-')); } catch { /* none */ }
    out.emulator = isFile(path.join(sdk, 'emulator', exe('emulator')));
  }
  if (!jdk) out.problems.push('No JDK 17 or newer found. Android Studio includes one; or set JAVA_HOME / the JDK folder in Settings.');
  return out;
}

/* ---------- devices ---------- */
async function listDevices(sdk) {
  if (!sdk) return { devices: [], avds: [] };
  const adb = path.join(sdk, 'platform-tools', exe('adb'));
  const r = await run(adb, ['devices', '-l']);
  const devices = [];
  for (const line of r.stdout.split('\n').slice(1)) {
    const m = line.trim().match(/^(\S+)\s+(device|offline|unauthorized)\b(.*)$/); if (!m) continue;
    const props = Object.fromEntries([...m[3].matchAll(/(\w+):(\S+)/g)].map(x => [x[1], x[2]]));
    const emu = m[1].startsWith('emulator-');
    let name = (props.model || m[1]).replace(/_/g, ' ');
    if (emu && m[2] === 'device') { const a = await run(adb, ['-s', m[1], 'emu', 'avd', 'name']); const n = a.stdout.split('\n')[0].trim(); if (n && n !== 'OK') name = n.replace(/_/g, ' '); }
    devices.push({ serial: m[1], state: m[2], name, kind: emu ? 'emulator' : 'device' });
  }
  let avds = [];
  const emuBin = path.join(sdk, 'emulator', exe('emulator'));
  if (isFile(emuBin)) { const a = await run(emuBin, ['-list-avds']); avds = a.stdout.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('INFO')); }
  return { devices, avds };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function bootAvd(sdk, avd, log, signal) {
  const adb = path.join(sdk, 'platform-tools', exe('adb'));
  const before = new Set((await listDevices(sdk)).devices.map(d => d.serial));
  const child = spawn(path.join(sdk, 'emulator', exe('emulator')), ['-avd', avd, '-netdelay', 'none', '-netspeed', 'full'], { detached: true, stdio: 'ignore' });
  child.unref();
  log(`Starting emulator ${avd}…`);
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new Error('Stopped');
    await sleep(2000);
    const { devices } = await listDevices(sdk);
    const fresh = devices.find(d => d.kind === 'emulator' && !before.has(d.serial) && d.state === 'device');
    if (!fresh) continue;
    const b = await run(adb, ['-s', fresh.serial, 'shell', 'getprop', 'sys.boot_completed']);
    if (b.stdout.trim() === '1') { log(`Emulator ${avd} is ready (${fresh.serial})`); return fresh.serial; }
  }
  throw new Error(`The emulator ${avd} didn't finish booting within 4 minutes.`);
}

/* ---------- gradle ---------- */
function ensureLocalProperties(dir, sdk) {
  const file = path.join(dir, 'local.properties'), want = `sdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}`;
  let body = ''; try { body = fs.readFileSync(file, 'utf8'); } catch { /* new */ }
  if (body.split('\n').some(l => l.trim() === want)) return;
  const kept = body.split('\n').filter(l => l.trim() && !l.startsWith('sdk.dir='));
  fs.writeFileSync(file, ['## Written by Facet. Points Gradle at your Android SDK.', want, ...kept].join('\n') + '\n');
}
/** Kotlin, AAPT and Gradle error lines → structured problems. */
function parseBuildLine(line, dir) {
  let m = line.match(/^([ew]): (?:file:\/\/)?(.+?\.kts?):(\d+):(\d+) (.*)$/);
  if (m) return { sev: m[1] === 'e' ? 'error' : 'warning', file: path.relative(dir, m[2]).split(path.sep).join('/'), line: Number(m[3]), col: Number(m[4]), msg: m[5] };
  m = line.match(/^ERROR: (.+?):(\d+):\s*AAPT: error: (.*)$/);
  if (m) return { sev: 'error', file: path.relative(dir, m[1]).split(path.sep).join('/'), line: Number(m[2]), col: 0, msg: m[3] };
  return null;
}
function runGradle(dir, tasks, env, onLine, signal) {
  return new Promise(resolve => {
    const wrapper = path.join(dir, isWin ? 'gradlew.bat' : 'gradlew');
    try { if (!isWin) fs.chmodSync(wrapper, 0o755); } catch { /* checked below */ }
    if (!isFile(wrapper)) return resolve({ code: -1, error: 'This project has no Gradle wrapper (gradlew).' });
    const child = spawn(wrapper, [...tasks, '--console=plain'], { cwd: dir, env: { ...process.env, ...env }, detached: !isWin });
    const kill = () => { try { if (isWin) child.kill(); else process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ } };
    signal.addEventListener('abort', kill, { once: true });
    let buf = { out: '', err: '' };
    const feed = (k, chunk) => { buf[k] += chunk; const parts = buf[k].split(/\r?\n/); buf[k] = parts.pop(); parts.forEach(l => onLine(l, k === 'err')); };
    child.stdout.on('data', c => feed('out', String(c))); child.stderr.on('data', c => feed('err', String(c)));
    child.on('error', e => resolve({ code: -1, error: e.message }));
    child.on('close', code => { if (buf.out) onLine(buf.out, false); if (buf.err) onLine(buf.err, true); resolve({ code: signal.aborted ? -2 : code }); });
  });
}
async function launch(sdk, serial, pkg) {
  const adb = path.join(sdk, 'platform-tools', exe('adb'));
  return run(adb, ['-s', serial, 'shell', 'am', 'start', '-n', `${pkg}/${pkg}.MainActivity`]);
}
async function forceStop(sdk, serial, pkg) { return run(path.join(sdk, 'platform-tools', exe('adb')), ['-s', serial, 'shell', 'am', 'force-stop', pkg]); }
async function logcat(sdk, serial, pkg, onLine, signal) {
  const adb = path.join(sdk, 'platform-tools', exe('adb'));
  let pid = '';
  for (let i = 0; i < 20 && !pid && !signal.aborted; i++) { const r = await run(adb, ['-s', serial, 'shell', 'pidof', '-s', pkg]); pid = r.stdout.trim(); if (!pid) await sleep(500); }
  if (!pid) { onLine({ level: 'W', tag: 'Facet', msg: 'The app process was not found, so logcat is not attached.' }); return; }
  const child = spawn(adb, ['-s', serial, 'logcat', '-v', 'brief', `--pid=${pid}`]);
  signal.addEventListener('abort', () => child.kill(), { once: true });
  // logcat --pid keeps running after the process dies, so watch the pid and stop when the app exits.
  const watch = setInterval(async () => { const r = await run(adb, ['-s', serial, 'shell', 'pidof', '-s', pkg]); if (r.stdout.trim() !== pid) { clearInterval(watch); child.kill(); } }, 2500);
  child.on('close', () => clearInterval(watch));
  let rest = '';
  child.stdout.on('data', c => { rest += String(c); const parts = rest.split(/\r?\n/); rest = parts.pop(); parts.forEach(l => { const m = l.match(/^([VDIWEF])\/(.+?)\(\s*\d+\):\s?(.*)$/); if (m) onLine({ level: m[1], tag: m[2].trim(), msg: m[3] }); else if (l.trim() && !l.startsWith('---------')) onLine({ level: 'I', tag: '', msg: l }); }); });
  return new Promise(r => child.on('close', r));
}

module.exports = { status, findSdk, findJdk, listDevices, bootAvd, ensureLocalProperties, runGradle, parseBuildLine, launch, forceStop, logcat };
