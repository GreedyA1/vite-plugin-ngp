// Which diagnostics `test.runtimeScopes` drops, on hand-written analyzer metadata. The Vitest runs
// in vitest-options.test.mjs cover an inline and an external template end to end; this covers the
// cases that must stay, and two components with external templates in one file. Run `pnpm build`
// first.

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dropRuntimeScoped} from '../dist/compiler.js';

const diagnostic = (code, filePath, start) => ({code, category: 1, filePath, messageText: `NG${code}`, span: {start, end: start + 5}});

test('an external template: its scope errors go with its component', () => {
  const metadata = {
    filePath: '/app/src/legacy.ts',
    classes: [
      {className: 'Legacy', component: {standalone: false, templateUrl: {url: './legacy.html', resolvedPath: '/app/src/legacy.html'}}},
      {className: 'Modern', component: {standalone: true, templateUrl: {url: './modern.html', resolvedPath: '/app/src/modern.html'}}},
    ],
  };
  const kept = dropRuntimeScoped(
    [
      diagnostic(8001, '/app/src/legacy.html', 10), // non-standalone: dropped
      diagnostic(8008, '/app/src/legacy.html', 20), // NG8008 outside a spec: kept
      diagnostic(8001, '/app/src/modern.html', 10), // standalone outside a spec: kept
      diagnostic(8002, '/app/src/other.html', 10), // no owner: kept
      diagnostic(2304, '/app/src/legacy.html', 30), // not a scope error: kept
    ],
    '/app/src/legacy.ts',
    metadata,
  );
  assert.deepEqual(
    kept.map((d) => `${d.code} ${d.filePath}`),
    ['8008 /app/src/legacy.html', '8001 /app/src/modern.html', '8002 /app/src/other.html', '2304 /app/src/legacy.html'],
  );
});

test('a spec file: every component in it is spec-declared', () => {
  const metadata = {
    filePath: '/app/src/host.spec.ts',
    classes: [{className: 'Host', component: {standalone: true, templateSpan: {start: 100, end: 200}}}],
  };
  const kept = dropRuntimeScoped(
    [diagnostic(8004, undefined, 120), diagnostic(8008, '/app/src/host.spec.ts', 150), diagnostic(8001, undefined, 300)],
    '/app/src/host.spec.ts',
    metadata,
  );
  // The last one is outside the template, so it belongs to no component.
  assert.deepEqual(kept.map((d) => d.code), [8001]);
});
