// What the compiler reports about a template beyond type errors. Since Angular 22.3.0-next.3 ngp
// runs Angular's extended diagnostics, the NG81xx checks `ng build` reports, and names their code
// in the message itself. Run `pnpm build` first; needs an ngp toolchain build.

import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import * as fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {createServer} from 'vite';
import {NgpCompiler} from '../dist/compiler.js';
import {ngp} from '../dist/index.js';
import {copyFixture, recordingLogger, toolchain} from './fixture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const fixture = path.join(here, 'fixtures/file-changes');

/**
 * Compiles `code` as the fixture app's `greeting.ts`, with `angularCompilerOptions` added to the
 * fixture's tsconfig, and returns what ngp reported about it.
 */
async function diagnose(code, angularCompilerOptions = {}) {
  // realpath: on macOS the temp dir is behind a /var -> /private/var symlink, and the analyzer
  // reports real paths.
  const root = realpathSync(await fs.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-ngp-diagnostics-')));
  await fs.cp(fixture, root, {recursive: true});
  // The fixture has no dependencies of its own; borrow the repo's (pnpm installs them hoisted).
  await fs.symlink(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  const file = path.join(root, 'src/app/greeting.ts');
  await fs.writeFile(file, code);
  const tsconfig = path.join(root, 'tsconfig.json');
  const config = JSON.parse(await fs.readFile(tsconfig, 'utf8'));
  config.angularCompilerOptions = {...config.angularCompilerOptions, ...angularCompilerOptions};
  await fs.writeFile(tsconfig, JSON.stringify(config));
  let compiler;
  try {
    compiler = await NgpCompiler.create({toolchainDir: toolchain, engine: 'native', tsconfig, analyzerTsconfig: tsconfig, enableHmr: false});
    return (await compiler.transform(file, code))?.diagnostics ?? [];
  } finally {
    compiler?.close();
    await fs.rm(root, {recursive: true, force: true});
  }
}

const uninvokedSignal = `import {Component, signal} from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: '<p [style.width]="12">{{ count }}</p>',
})
export class Greeting {
  count = signal(0);
}
`;

test('reports Angular\'s extended diagnostics as warnings, each naming its code once', async () => {
  const diagnostics = await diagnose(uninvokedSignal);
  // NG8109: an interpolated signal that isn't invoked. NG8119: a number bound to a CSS length.
  assert.deepEqual(diagnostics.map((d) => d.code).sort(), [8109, 8119]);
  for (const d of diagnostics) {
    // ts.DiagnosticCategory.Warning, so the plugin warns instead of failing the build.
    assert.equal(d.category, 0, `NG${d.code} should be a warning`);
    // The plugin only prefixes a message that doesn't already carry its code.
    assert.ok(d.messageText.startsWith(`NG${d.code}: `), `NG${d.code} should name its code: ${d.messageText}`);
  }
});

test('a clean component reports nothing', async () => {
  const diagnostics = await diagnose(`import {Component, signal} from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: '<p [style.width.px]="12">{{ count() }}</p>',
})
export class Greeting {
  count = signal(0);
}
`);
  assert.deepEqual(diagnostics, []);
});

test('angularCompilerOptions.extendedDiagnostics sets the severity, as under ng build', async () => {
  const diagnostics = await diagnose(uninvokedSignal, {
    extendedDiagnostics: {defaultCategory: 'error', checks: {numericCssPropertyRequiresUnit: 'suppress'}},
  });
  // ts.DiagnosticCategory.Error for NG8109, and NG8119 is gone.
  assert.deepEqual(diagnostics.map((d) => [d.code, d.category]), [[8109, 1]]);
});

test('a mistyped extendedDiagnostics check fails at startup instead of silently turning them all off', async () => {
  await assert.rejects(
    diagnose(uninvokedSignal, {extendedDiagnostics: {checks: {interpolatedSignalNotInvokd: 'error'}}}),
    /NG\d+: Angular compiler option "extendedDiagnostics\.checks" has an unknown check: "interpolatedSignalNotInvokd"/,
  );
});

// A diagnostic in an external template carries an offset into the .html file. Vite's dev server,
// which Vitest runs, used to read that offset against the .ts module: past the module's end it
// threw, so a warning failed the module, and with it every spec that imports it.

// The interpolated signal sits on line 41, far past the end of the 200-byte component.
const externalTemplate = `${'<p>padding</p>\n'.repeat(40)}<p>{{ count }}</p>\n`;
const externalComponent = `import {Component, signal} from '@angular/core';

@Component({selector: 'app-greeting', templateUrl: './greeting.html'})
export class Greeting {
  count = signal(0);
}
`;

/** The fixture app, copied, with `greeting.ts` using the template above and `angularCompilerOptions` added. */
async function externalTemplateApp(label, angularCompilerOptions = {}) {
  const root = await copyFixture('file-changes', `diagnostics-${label}`);
  await fs.writeFile(path.join(root, 'src/app/greeting.ts'), externalComponent);
  await fs.writeFile(path.join(root, 'src/app/greeting.html'), externalTemplate);
  const tsconfig = path.join(root, 'tsconfig.json');
  const config = JSON.parse(await fs.readFile(tsconfig, 'utf8'));
  config.angularCompilerOptions = {...config.angularCompilerOptions, ...angularCompilerOptions};
  await fs.writeFile(tsconfig, JSON.stringify(config));
  return root;
}

test('under Vitest, a warning in an external template names its line, and the spec still runs', async () => {
  const root = await externalTemplateApp('vitest');
  try {
    await fs.writeFile(
      path.join(root, 'src/app/greeting.spec.ts'),
      `import {expect, it} from 'vitest';
import {Greeting} from './greeting';

it('compiles the component', () => {
  expect((Greeting as any).ɵcmp).toBeDefined();
});
`,
    );
    await fs.writeFile(
      path.join(root, 'vitest.config.mjs'),
      `import {ngp} from ${JSON.stringify(pathToFileURL(path.join(here, '../dist/index.js')).href)};

export default {
  cacheDir: '.vite',
  plugins: [ngp({toolchain: ${JSON.stringify(toolchain)}})],
  test: {environment: 'node', include: ['src/**/*.spec.ts']},
};
`,
    );
    const {code, output} = await vitestRun(root);
    assert.equal(code, 0, output);
    assert.match(output, /Tests\s+1 passed/);
    assert.match(output, /src\/app\/greeting\.html:41:7: NG8109: count is a function and should be invoked/);
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

test('set to error, an external template diagnostic fails the module with its line and nothing else', async () => {
  const root = await externalTemplateApp('error', {extendedDiagnostics: {defaultCategory: 'error'}});
  const {logger, messages} = recordingLogger();
  const server = await createServer({
    root,
    cacheDir: path.join(root, '.vite'),
    configFile: false,
    customLogger: logger,
    plugins: [ngp({toolchain, typeCheck: false})],
    server: {middlewareMode: true, ws: false},
  });
  try {
    const error = await server.environments.client.transformRequest('/src/app/greeting.ts').then(
      () => undefined,
      (e) => e,
    );
    assert.ok(error, 'the module should fail');
    assert.match(error.message, /src\/app\/greeting\.html:41:7: NG8109: /);
    // The diagnostic is the thrown error. Before the fix, Vite also logged a crash in its own
    // error handler, reading the template's offset against the .ts module.
    assert.deepEqual(messages.errors, []);
  } finally {
    await server.close();
    await fs.rm(root, {recursive: true, force: true});
  }
});

/** Runs `vitest run` in `root` and resolves to its exit code and everything it printed. */
async function vitestRun(root) {
  const vitest = path.join(path.dirname(createRequire(path.join(repo, 'playground/package.json')).resolve('vitest/package.json')), 'vitest.mjs');
  const run = promisify(execFile)(process.execPath, [vitest, 'run'], {cwd: root, env: {...process.env, NO_COLOR: '1'}});
  return run.then(
    ({stdout, stderr}) => ({code: 0, output: stdout + stderr}),
    (e) => ({code: e.code, output: `${e.stdout}${e.stderr}`}),
  );
}
