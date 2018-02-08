import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

const content = `

<p>Feel free to contact us with any questions or comments!</p>

<p title="E-mail RPNow">
  <mat-icon>mail</mat-icon>
  <a class="link" href="mailto:rpnow.net@gmail.com" target="_blank">rpnow.net@gmail.com</a>
</p>

<p title="RPNow on Facebook">
  <mat-icon svgIcon="facebook"></mat-icon>
  <a class="link" href="https://fb.me/rpnow.net" target="_blank">fb.me/rpnow.net</a>
</p>

<p title="RPNow on Twitter">
  <mat-icon svgIcon="twitter"></mat-icon>
  <a class="link" href="https://twitter.com/rpnow_net" target="_blank">@rpnow_net</a>
</p>

<p title="RPNow on Tumblr">
  <mat-icon svgIcon="tumblr"></mat-icon>
  <a class="link" href="https://rpnow.tumblr.com/" target="_blank">rpnow.tumblr.com</a>
</p>

<p title="RPNow on Discord">
  <mat-icon svgIcon="discord"></mat-icon>
  <a class="link" href="https://discord.gg/rGtKnHV" target="_blank">discord.gg/rGtKnHV</a>
</p>

`

@Component({
  template: `<mat-dialog-content>${content}</mat-dialog-content>`,
  styles: []
})
export class ContactDialogComponent {

  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/facebook.svg'))
    iconRegistry.addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/twitter.svg'))
    iconRegistry.addSvgIcon('tumblr', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/tumblr.svg'))
    iconRegistry.addSvgIcon('discord', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/discord.svg'))
  }

}
