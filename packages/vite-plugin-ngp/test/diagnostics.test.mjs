// What the compiler reports about a template beyond type errors. Since Angular 22.3.0-next.3 ngp
// runs Angular's extended diagnostics, the NG81xx checks `ng build` reports, and names their code
// in the message itself. Run `pnpm build` first; needs an ngp toolchain build.

import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {describe, test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {NgpCompiler} from '../dist/compiler.js';
import {ngp} from '../dist/index.js';
import {copyFixture, recordingLogger, toolchain} from './fixture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const fixture = path.join(here, 'fixtures/file-changes');
const toolchainDir = toolchain;

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
    compiler = await NgpCompiler.create({toolchainDir, engine: 'native', tsconfig, analyzerTsconfig: tsconfig, enableHmr: false});
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
// threw, so a warning failed the module, and short of it the frame showed the wrong file.
describe('a diagnostic in an external template', () => {
  // The interpolated signal sits on line 41, far past the end of the 200-byte component.
  const template = `${'<p>padding</p>\n'.repeat(40)}<p>{{ count }}</p>\n`;
  const component = `import {Component, signal} from '@angular/core';

@Component({selector: 'app-greeting', templateUrl: './greeting.html'})
export class Greeting {
  count = signal(0);
}
`;

  /** Serves the fixture with `greeting.html` as above, and transforms `greeting.ts`. */
  async function transformGreeting(label, angularCompilerOptions = {}) {
    const root = await copyFixture('file-changes', `diagnostics-${label}`);
    await fs.writeFile(path.join(root, 'src/app/greeting.ts'), component);
    await fs.writeFile(path.join(root, 'src/app/greeting.html'), template);
    const tsconfig = path.join(root, 'tsconfig.json');
    const config = JSON.parse(await fs.readFile(tsconfig, 'utf8'));
    config.angularCompilerOptions = {...config.angularCompilerOptions, ...angularCompilerOptions};
    await fs.writeFile(tsconfig, JSON.stringify(config));
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
      const outcome = await server.environments.client.transformRequest('/src/app/greeting.ts').then(
        (result) => ({result}),
        (error) => ({error}),
      );
      return {...outcome, messages};
    } finally {
      await server.close();
      await fs.rm(root, {recursive: true, force: true});
    }
  }

  test('is a warning that names the template line, and the module still compiles', async () => {
    const {result, error, messages} = await transformGreeting('warning');
    assert.equal(error, undefined);
    assert.match(result.code, /Greeting/);
    const warning = messages.warnings.find((w) => w.includes('NG8109'));
    assert.ok(warning, `no NG8109 warning in:\n${messages.warnings.join('\n')}`);
    assert.match(warning, /src\/app\/greeting\.html:41:7: NG8109: count is a function and should be invoked/);
    assert.deepEqual(messages.errors, []);
  });

  test('set to error, fails the module with the template line and nothing else', async () => {
    const {error, messages} = await transformGreeting('error', {extendedDiagnostics: {defaultCategory: 'error'}});
    assert.ok(error, 'the module should fail');
    assert.match(error.message, /src\/app\/greeting\.html:41:7: NG8109: /);
    // Vite logs a crash in its own error handler as an error; the diagnostic itself is the throw.
    assert.deepEqual(messages.errors, []);
  });
});
