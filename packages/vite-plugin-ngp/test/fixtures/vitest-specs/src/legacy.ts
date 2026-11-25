import {Component, Input} from '@angular/core';

// Declared in no NgModule: a spec gives it its scope with `declarations`. Its template is a file,
// so its scope errors arrive with the template's path, not the component's.
@Component({selector: 'app-legacy', standalone: false, templateUrl: './legacy.html'})
export class Legacy {
  label = 'from legacy';
}

@Component({selector: 'app-legacy-child', standalone: false, template: '<span>{{ label }}</span>'})
export class LegacyChild {
  @Input() label = '';
}
