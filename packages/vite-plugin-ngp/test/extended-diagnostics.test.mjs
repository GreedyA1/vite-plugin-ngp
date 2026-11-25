// The plugin's list of extended diagnostic codes, against every check name ngp accepts under
// `extendedDiagnostics.checks`. When Angular adds or drops a check, this fails, and
// EXTENDED_DIAGNOSTIC_CODES needs the same change. Run `pnpm build` first; needs an ngp toolchain
// build.

import assert from 'node:assert/strict';
import * as path from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {EXTENDED_DIAGNOSTIC_CODES} from '../dist/extended-diagnostics.js';
import {toolchain} from './fixture.mjs';

const ngp = (file) => import(pathToFileURL(path.join(toolchain, 'preprocessor/src', file)).href);

/** `interpolatedSignalNotInvoked` to `INTERPOLATED_SIGNAL_NOT_INVOKED`, the name's key in `ErrorCode`. */
const errorCodeKey = (name) =>
  // The one key that isn't its check name in snake case.
  name === 'missingNgForOfLet' ? 'MISSING_NGFOROF_LET' : name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();

test("the extended diagnostic codes are the checks ngp's options accept", async () => {
  const {SUPPORTED_DIAGNOSTIC_NAMES} = await ngp('compiler_options.js');
  const {ErrorCode} = await ngp('error_code.js');
  const codes = [...SUPPORTED_DIAGNOSTIC_NAMES].map((name) => {
    const code = ErrorCode[errorCodeKey(name)];
    assert.equal(typeof code, 'number', `${name} has no ErrorCode under ${errorCodeKey(name)}`);
    // Some are negative in the enum, like -8011; diagnostics always carry the positive code.
    return Math.abs(code);
  });
  assert.deepEqual([...EXTENDED_DIAGNOSTIC_CODES].sort(), codes.sort());
});

test('the checks ngp runs as factories are all in the list', async () => {
  const {ALL_DIAGNOSTIC_FACTORIES} = await ngp('extended_diagnostics/index.js');
  assert.deepEqual(ALL_DIAGNOSTIC_FACTORIES.map((f) => f.code).filter((code) => !EXTENDED_DIAGNOSTIC_CODES.has(code)), []);
});
