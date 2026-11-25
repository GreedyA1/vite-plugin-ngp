// The `test` option's switches, each run as a real Vitest run on test/fixtures/vitest-specs: once
// without the switch, to show the spec needs it, and once with it. Run `pnpm build` first; needs
// an ngp toolchain build.

import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createRequire} from 'node:module';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {test} from 'node:test';
import {promisify} from 'node:util';
import {copyFixture, toolchain} from './fixture.mjs';

const vitestBin = path.join(path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs');

/**
 * Runs `vitest run <spec>` on a fresh copy of the fixture, with `testOptions` as `test` and
 * `angularCompilerOptions` added to its tsconfig.
 */
async function runSpec(label, spec, testOptions, angularCompilerOptions = {}) {
  const root = await copyFixture('vitest-specs', label);
  const tsconfig = path.join(root, 'tsconfig.json');
  const config = JSON.parse(await fs.readFile(tsconfig, 'utf8'));
  config.angularCompilerOptions = {...config.angularCompilerOptions, ...angularCompilerOptions};
  await fs.writeFile(tsconfig, JSON.stringify(config));
  try {
    const {stdout, stderr} = await promisify(execFile)(process.execPath, [vitestBin, 'run', spec], {
      cwd: root,
      env: {...process.env, NO_COLOR: '1', NGP_TOOLCHAIN: toolchain, NGP_TEST_OPTIONS: JSON.stringify(testOptions)},
    });
    return {ok: true, output: stdout + stderr};
  } catch (error) {
    return {ok: false, output: `${error.stdout}${error.stderr}`};
  }
}

test('jitCompat: an overridden component keeps the scopes of the NgModules it imports', async () => {
  const without = await runSpec('jit-off', 'src/override.spec.ts', {});
  assert.equal(without.ok, false, 'without jitCompat the override sees no NgModule scope');
  assert.match(without.output, /2 failed/);

  const withIt = await runSpec('jit-on', 'src/override.spec.ts', {jitCompat: true});
  assert.equal(withIt.ok, true, withIt.output);
  assert.match(withIt.output, /2 passed/);
});

test('extendedDiagnostics: an extended diagnostic set to error warns in a spec instead of failing it', async () => {
  const asError = {extendedDiagnostics: {defaultCategory: 'error'}};
  const without = await runSpec('extended-off', 'src/counter.spec.ts', {}, asError);
  assert.equal(without.ok, false, 'without the switch NG8109 fails the spec file');
  assert.match(without.output, /NG8109: count is a function and should be invoked/);
  assert.match(without.output, /no tests|1 failed/i);

  const withIt = await runSpec('extended-on', 'src/counter.spec.ts', {extendedDiagnostics: 'warning'}, asError);
  assert.equal(withIt.ok, true, withIt.output);
  assert.match(withIt.output, /1 passed/);
  assert.match(withIt.output, /warning.*NG8109: count is a function and should be invoked/i);
});
