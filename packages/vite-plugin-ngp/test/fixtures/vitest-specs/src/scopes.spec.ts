// Scopes that only exist at runtime: TestBed's `declarations` for non-standalone components, and
// `overrideComponent` for a test host declared in the spec.
import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {expect, test} from 'vitest';
import {Legacy, LegacyChild} from './legacy';
import {NeedsLabel} from './needs-label';

@Component({selector: 'app-host', standalone: false, template: '<app-legacy></app-legacy>'})
class Host {}

// No label yet: each test sets one with an override.
@Component({selector: 'app-test-host', imports: [NeedsLabel], template: '<app-needs-label />'})
class TestHost {}

test('non-standalone components get their scope from declarations', () => {
  TestBed.configureTestingModule({declarations: [Host, Legacy, LegacyChild]});
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toBe('from legacy');
});

test('a spec-declared host gets its required input from an override', () => {
  TestBed.overrideComponent(TestHost, {set: {template: '<app-needs-label label="from override" />'}});
  const fixture = TestBed.createComponent(TestHost);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toBe('from override');
});
