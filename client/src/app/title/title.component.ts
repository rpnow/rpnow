import { Component } from '@angular/core';

@Component({
  selector: 'rpn-title',
  template: `
    <h1>Goodbye</h1>
    <p>Thanks for using RPNow! We are now closed.</p>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 5%;
      box-sizing: border-box;
    }
    p {
      margin: 0;
      text-align: center;
      line-height: 1.5;
    }
  `],
})
export class TitleComponent {
}
