// TestBed.overrideComponent recompiles the component with JIT, which reads the scope of every
// NgModule it imports: CommonModule from a linked library, and Shared from the app.
import {CommonModule} from '@angular/common';
import {Component, NgModule} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {expect, test} from 'vitest';

@NgModule({imports: [CommonModule], exports: [CommonModule]})
class Shared {}

@Component({selector: 'app-library', imports: [CommonModule], template: '<p>before</p>'})
class FromLibrary {
  show = true;
}

@Component({selector: 'app-module', imports: [Shared], template: '<p>before</p>'})
class FromAppModule {
  show = true;
}

test('an overridden template sees a library NgModule', () => {
  TestBed.overrideComponent(FromLibrary, {set: {template: '<p *ngIf="show">shown</p>'}});
  const fixture = TestBed.createComponent(FromLibrary);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toBe('shown');
});

test('an overridden template sees what an app NgModule exports', () => {
  TestBed.overrideComponent(FromAppModule, {set: {template: '<p *ngIf="show">shown</p>'}});
  const fixture = TestBed.createComponent(FromAppModule);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toBe('shown');
});
