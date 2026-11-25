// The plugin's list of extended diagnostic codes, against the checks ngp runs. When ngp adds or
// drops a check, this fails, and EXTENDED_DIAGNOSTIC_CODES needs the same change. Run `pnpm build`
// first; needs an ngp toolchain build.

import assert from 'node:assert/strict';
import * as path from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {EXTENDED_DIAGNOSTIC_CODES} from '../dist/extended-diagnostics.js';
import {toolchain} from './fixture.mjs';

test("the extended diagnostic codes are ngp's checks, plus the four it doesn't run yet", async () => {
  const checks = await import(pathToFileURL(path.join(toolchain, 'preprocessor/src/extended_diagnostics/index.js')).href);
  // NG8113 runs beside the factories, not as one of them.
  const ngp = new Set([...checks.ALL_DIAGNOSTIC_FACTORIES.map((f) => f.code), 8113]);
  assert.deepEqual([...ngp].filter((code) => !EXTENDED_DIAGNOSTIC_CODES.has(code)), [], 'ngp runs a check the plugin doesn\'t list');
  assert.deepEqual([...EXTENDED_DIAGNOSTIC_CODES].filter((code) => !ngp.has(code)).sort(), [8102, 8107, 8115, 8117]);
});
