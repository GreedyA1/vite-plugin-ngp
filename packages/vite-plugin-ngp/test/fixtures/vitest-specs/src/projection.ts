import {Component} from '@angular/core';

@Component({selector: 'app-card', template: '<ng-content select="[header]" /><ng-content />'})
export class Card {}

// Two root nodes inside `@if`, so the header can't reach its slot: extended diagnostic NG8011,
// which ngp reports from the type-check block, not from its list of check factories.
@Component({selector: 'app-projection', imports: [Card], template: '<app-card>@if (true) {<span header>h</span><span>b</span>}</app-card>'})
export class Projection {}
