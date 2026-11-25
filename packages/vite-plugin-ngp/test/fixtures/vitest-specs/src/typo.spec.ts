import {TestBed} from '@angular/core/testing';
import {expect, test} from 'vitest';
import {Typo} from './typo';

test('renders', () => {
  const fixture = TestBed.createComponent(Typo);
  fixture.detectChanges();
  expect(fixture.nativeElement).toBeTruthy();
});
