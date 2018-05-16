import { Component, ChangeDetectionStrategy } from '@angular/core';
import * as marked from 'marked';

const template = marked(`

Gather up your friends &mdash; it's time to go on an adventure! Give your story a title, name your characters, customize their colors, and start writing together!

That's what RPNow is all about. **[RPNow](https://rpnow.net/) is the Dead-Simple Roleplay Chatroom Service.** It is the _only_ roleplay site that requires no user
registration, supports multiple characters per user, keeps your roleplays permanently, and allows you to download the complete transcripts as text files at any time.

Simply put, it's the best place on the web to start your next RP.

#### Donations

RPNow is entirely supported by user donations. Over the past six months, our generous users have donated over $200 USD to RPNow's continued existence. **If you want to
support RPNow, [please become our patron on Patreon!](https://www.patreon.com/rpnow)**

The following people actively support RPNow by donating $5 or more per month:

*   **Jackson Marriott**
*   **Karl O'Malley**
*   Charlie and Elliott
*   Diana Lennox
*   Eli
*   Mika
*   ... and 1 more who chose not to be listed.

#### Talk to Us

Need to get in touch with us? E-mail us at [rpnow.net@gmail.com](mailto:rpnow.net@gmail.com)!

Alternatively, you can find us on social media:

*   Facebook: [@rpnow.net](https://fb.me/rpnow.net)
*   Twitter: [@rpnow_net](https://twitter.com/rpnow_net)
*   Tumblr: [@rpnow](https://rpnow.tumblr.com/)
*   Patreon: [patreon.com/rpnow](https://www.patreon.com/rpnow)

#### Credits

RPNow was built by Nigel Nelson with extra graphic design guidance from Hannah Liddell, and feedback from our many users.

`);

@Component({
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

      <h3 mat-dialog-title fxFlex>About RPNow</h3>

      <button mat-icon-button mat-dialog-title mat-dialog-close>
        <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
      </button>

    </div>

    <mat-dialog-content class="generated-links" [innerHtml]="innerHtml"></mat-dialog-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutDialogComponent {
  innerHtml: string = template;
}
