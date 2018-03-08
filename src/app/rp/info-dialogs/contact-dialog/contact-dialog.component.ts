import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  templateUrl: './contact-dialog.html',
  styles: []
})
export class ContactDialogComponent {

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private dialogRef: MatDialogRef<ContactDialogComponent>
  ) {
    iconRegistry.addSvgIcon('facebook', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/facebook.svg'))
    iconRegistry.addSvgIcon('twitter', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/twitter.svg'))
    iconRegistry.addSvgIcon('tumblr', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/tumblr.svg'))
    iconRegistry.addSvgIcon('discord', sanitizer.bypassSecurityTrustResourceUrl('/assets/img/discord.svg'))
  }

  close() {
    this.dialogRef.close();
  }

}
