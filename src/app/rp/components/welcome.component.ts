import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'rpn-welcome',
  template: `
    <div id="welcome">

      <h3>Welcome to your new RP!</h3>

      <p>
        Use this link to invite other participants, or to return to this room later. <strong>Don't lose it!</strong>
      </p>

      <p>
        <code><a [href]="href">{{ shortHref }}</a></code>
      </p>

    </div>
  `,
  styles: [`
    #welcome {
      margin: 3vh auto 0;
      padding: 20px;
      width: 96vw;
      max-width: 400px;
    }
    #welcome a {
      word-break: break-word;
      font-size: 115%;
      text-decoration: none;
      border-bottom: 1px dotted rgb(124, 77, 255);
      color: rgb(124, 77, 255);
      opacity: 0.87;
    }
    :host-context(.dark-theme) #welcome a {
      color: rgb(255,193,7);
      border-bottom-color: rgb(255,193,7);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WelcomeComponent {
  href = location.href;
  shortHref = this.href.split('//')[1];
}
