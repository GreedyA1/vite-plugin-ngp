import {Component, signal} from '@angular/core';

// `{{ count }}` without `()`: extended diagnostic NG8109.
@Component({selector: 'app-counter', template: '<p>{{ count }}</p>'})
export class Counter {
  count = signal(0);
}
