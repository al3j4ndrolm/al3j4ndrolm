'use strict';
// Project folders on disk. A Facet project is a normal Android Studio project with a facet.json
// next to settings.gradle.kts. Screens, navigation and theme are generated; ViewModels belong to the user.
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const core = require('../src/core.js');

// Templates are unpacked from the app archive (asarUnpack) so the gradlew/jar/fonts copy as real files.
const TEMPLATES = path.join(__dirname, '..', 'templates').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const MANIFEST = path.join('.facet', 'generated.json');

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
function inside(root, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new Error(`Refused an unsafe path: ${rel}`);
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new Error(`Refused a path outside the project: ${rel}`);
  return abs;
}
async function writeText(root, rel, body) { const abs = inside(root, rel); await fs.mkdir(path.dirname(abs), { recursive: true }); await fs.writeFile(abs, body, 'utf8'); }
async function copyTemplate(root, from, rel, mode) { const abs = inside(root, rel); await fs.mkdir(path.dirname(abs), { recursive: true }); await fs.copyFile(path.join(TEMPLATES, from), abs); if (mode) await fs.chmod(abs, mode); }

function checkProjectShape(project, sources) {
  const errs = core.validateProject(project);
  if (errs.length) throw new Error(errs.join(' '));
  for (const id of Object.keys(project.viewModels)) {
    if (typeof sources?.[id] !== 'string') throw new Error(`Missing source for ${project.viewModels[id].name}.`);
    if (!/\.kt$/.test(project.viewModels[id].file)) throw new Error(`Invalid ViewModel path ${project.viewModels[id].file}.`);
  }
}

/** Creates a new Android project folder. */
async function createProject(dir, { template, name, packageName }) {
  if (!core.isPackageName(packageName)) throw new Error('Use a package name like com.example.myapp (lowercase, at least two parts).');
  if (!String(name || '').trim()) throw new Error('Give the app a name.');
  if (await exists(dir) && (await fs.readdir(dir)).length) throw new Error(`The folder ${dir} already exists and isn't empty.`);
  const { project, sources } = template === 'sample' ? core.sampleProject(name.trim(), packageName) : core.blankProject(name.trim(), packageName);
  await fs.mkdir(dir, { recursive: true });
  for (const [rel, body] of Object.entries(core.scaffoldFiles(project))) await writeText(dir, rel, body);
  await copyTemplate(dir, 'wrapper/gradlew', 'gradlew', 0o755);
  await copyTemplate(dir, 'wrapper/gradlew.bat', 'gradlew.bat');
  await copyTemplate(dir, 'wrapper/gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.jar');
  await copyTemplate(dir, 'wrapper/gradle/wrapper/gradle-wrapper.properties', 'gradle/wrapper/gradle-wrapper.properties');
  await copyTemplate(dir, 'fonts/LICENSES.txt', 'licenses/fonts-OFL.txt');
  await saveProject(dir, project, sources);
  return { project, sources };
}

/** Reads facet.json and every ViewModel source. */
async function openProject(dir) {
  const file = path.join(dir, 'facet.json');
  const project = JSON.parse(await fs.readFile(file, 'utf8'));
  const errs = core.validateProject(project);
  if (errs.length) throw new Error(errs.join(' '));
  const sources = {}, mtimes = {};
  for (const [id, vm] of Object.entries(project.viewModels)) {
    const abs = inside(dir, vm.file);
    if (await exists(abs)) { sources[id] = await fs.readFile(abs, 'utf8'); mtimes[id] = (await fs.stat(abs)).mtimeMs; }
    else sources[id] = '';
  }
  return { project, sources, mtimes };
}

/** Writes facet.json, ViewModel sources and all generated files; removes generated files that no longer exist. */
async function saveProject(dir, project, sources) {
  checkProjectShape(project, sources);
  const clean = core.clone(project);
  await writeText(dir, 'facet.json', JSON.stringify(clean, null, 2) + '\n');
  const mtimes = {};
  for (const [id, vm] of Object.entries(project.viewModels)) {
    const abs = inside(dir, vm.file);
    const current = await exists(abs) ? await fs.readFile(abs, 'utf8') : null;
    if (current !== sources[id]) await writeText(dir, vm.file, sources[id]);
    mtimes[id] = (await fs.stat(abs)).mtimeMs;
  }
  const generated = core.generatedFiles(project, sources);
  for (const [rel, body] of Object.entries(generated)) await writeText(dir, rel, body);
  const fonts = core.fontFiles(project);
  for (const [rel, from] of Object.entries(fonts)) if (!(await exists(inside(dir, rel)))) await copyTemplate(dir, from, rel);
  const now = [...Object.keys(generated), ...Object.keys(fonts)];
  let before = [];
  try { before = JSON.parse(await fs.readFile(path.join(dir, MANIFEST), 'utf8')); } catch { /* first save */ }
  const removed = [];
  for (const rel of before.filter(r => !now.includes(r))) {
    const abs = inside(dir, rel);
    if (!(await exists(abs))) continue;
    if (rel.endsWith('.kt') || rel.endsWith('.xml')) { const body = await fs.readFile(abs, 'utf8'); if (!body.includes('Generated by Facet')) continue; }
    await fs.rm(abs); removed.push(rel);
  }
  await writeText(dir, MANIFEST, JSON.stringify(now, null, 2) + '\n');
  return { written: now.length, removed, mtimes };
}

/** Finds the project folder for a path the user picked (the folder or its facet.json). */
function resolveProjectDir(p) {
  if (!p) return null;
  if (path.basename(p) === 'facet.json') return path.dirname(p);
  if (fsSync.existsSync(path.join(p, 'facet.json'))) return p;
  return null;
}

module.exports = { createProject, openProject, saveProject, resolveProjectDir, inside };
