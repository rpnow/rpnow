import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'rpn-lets-rpnow',
  template: `
    <header title="Let's RPNow">
      <aside>Let's</aside>
      <h1>RPNow</h1>
    </header>
  `,
  styles: [`
    aside {
      transform: translate(calc(-20vmin - 32px)) rotate(-10deg);
      text-align: center;
      margin-bottom: 0;
      font-size: calc(16px + 7vmin);
      line-height: 1;
      font-family: "Alice";
    }
    h1 {
      margin: -2vmin 0 0;
      text-align: center;
      font-size: calc(24px + 14vmin);
      line-height: 1;
      font-family: "Playfair Display";
      font-weight: normal;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LetsRpnowComponent {}
