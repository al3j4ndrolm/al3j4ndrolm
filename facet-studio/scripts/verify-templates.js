#!/usr/bin/env node
// Generates every starter template through the same code path as the app, then compiles each with Gradle.
// Usage: ANDROID_HOME=/path/to/sdk node scripts/verify-templates.js [outDir]
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const projects = require('../main/project.js');

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) { console.error('Set ANDROID_HOME to an Android SDK.'); process.exit(2); }
const out = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'facet-verify-')));

(async () => {
  let failed = 0;
  for (const [template, name, pkg] of [['blank', 'Notes', 'com.example.notes'], ['sample', 'Brew', 'com.example.brew']]) {
    const dir = path.join(out, name);
    fs.rmSync(dir, { recursive: true, force: true });
    await projects.createProject(dir, { template, name, packageName: pkg });
    fs.writeFileSync(path.join(dir, 'local.properties'), `sdk.dir=${sdk}\n`);
    console.log(`\n▶ ${template}: ./gradlew :app:assembleDebug in ${dir}`);
    const r = spawnSync(path.join(dir, 'gradlew'), [':app:assembleDebug', '--console=plain', '--warning-mode=summary'], { cwd: dir, stdio: 'inherit' });
    const apk = path.join(dir, 'app/build/outputs/apk/debug/app-debug.apk');
    if (r.status !== 0 || !fs.existsSync(apk)) { failed++; console.error(`✗ ${template} failed`); } else console.log(`✓ ${template} built ${apk}`);
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
