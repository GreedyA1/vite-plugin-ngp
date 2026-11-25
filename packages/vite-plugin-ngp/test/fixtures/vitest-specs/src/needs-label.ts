import {Component, input} from '@angular/core';

@Component({selector: 'app-needs-label', template: '<span>{{ label() }}</span>'})
export class NeedsLabel {
  label = input.required<string>();
}
