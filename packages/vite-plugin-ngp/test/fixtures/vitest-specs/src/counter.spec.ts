import {TestBed} from '@angular/core/testing';
import {expect, test} from 'vitest';
import {Counter} from './counter';

test('a component with an extended diagnostic still renders', () => {
  const fixture = TestBed.createComponent(Counter);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('[Signal');
});
