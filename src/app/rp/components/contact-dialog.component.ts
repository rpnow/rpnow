import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

        <h3 mat-dialog-title fxFlex>Contact RPNow</h3>

        <button mat-icon-button mat-dialog-title mat-dialog-close>
            <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
        </button>

    </div>

    <mat-dialog-content>

        <p>Questions? Concerns? Let us know!</p>

        <mat-nav-list>

            <a mat-list-item href="mailto:rpnow.net@gmail.com" target="_blank">
                <mat-icon mat-list-icon>mail</mat-icon>
                <p mat-line>Email &mdash; rpnow.net@gmail.com</p>
            </a>

            <a mat-list-item href="https://fb.me/rpnow.net" target="_blank">
                <mat-icon mat-list-icon svgIcon="facebook"></mat-icon>
                <p mat-line>Facebook &mdash; fb.me/rpnow.net</p>
            </a>

            <a mat-list-item href="https://twitter.com/rpnow_net" target="_blank">
                <mat-icon mat-list-icon svgIcon="twitter"></mat-icon>
                <p mat-line>Twitter &mdash; @rpnow_net</p>
            </a>

            <a mat-list-item href="https://rpnow.tumblr.com" target="_blank">
                <mat-icon mat-list-icon svgIcon="tumblr"></mat-icon>
                <p mat-line>Tumblr &mdash; rpnow.tumblr.com</p>
            </a>

            <a mat-list-item href="https://discord.gg/rGtKnHV" target="_blank">
                <mat-icon mat-list-icon svgIcon="discord"></mat-icon>
                <p mat-line>Discord &mdash; discord.gg/rGtKnHV</p>
            </a>

        </mat-nav-list>

    </mat-dialog-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactDialogComponent {

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer
  ) {
    iconRegistry.addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/facebook.svg'));
    iconRegistry.addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/twitter.svg'));
    iconRegistry.addSvgIcon('tumblr', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/tumblr.svg'));
    iconRegistry.addSvgIcon('discord', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/discord.svg'));
  }

}
