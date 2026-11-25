import {Component} from '@angular/core';

// A standalone component with a misspelled selector: a real error, whatever the spec does.
@Component({selector: 'app-typo', template: '<app-lable></app-lable>'})
export class Typo {}
