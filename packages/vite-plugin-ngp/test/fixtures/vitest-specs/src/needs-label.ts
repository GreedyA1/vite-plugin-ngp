import {Component, input} from '@angular/core';

export @Component({selector: 'app-needs-label', template: '<span>{{ label() }}</span>'})
class NeedsLabel {
  label = input.required<string>();
}
