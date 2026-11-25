import {Component, Input} from '@angular/core';

// Declared in no NgModule: a spec gives it its scope with `declarations`.
@Component({selector: 'app-legacy', standalone: false, template: '<app-legacy-child [label]="label"></app-legacy-child>'})
export class Legacy {
  label = 'from legacy';
}

@Component({selector: 'app-legacy-child', standalone: false, template: '<span>{{ label }}</span>'})
export class LegacyChild {
  @Input() label = '';
}
