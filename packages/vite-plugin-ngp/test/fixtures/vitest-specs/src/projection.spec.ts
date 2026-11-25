import {TestBed} from '@angular/core/testing';
import {expect, test} from 'vitest';
import {Projection} from './projection';

test('a component with a projection diagnostic still renders', () => {
  const fixture = TestBed.createComponent(Projection);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toBe('hb');
});
