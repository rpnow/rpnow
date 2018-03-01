import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from '../info-dialogs/about-dialog/about-dialog.component';
import { ContactDialogComponent } from '../info-dialogs/contact-dialog/contact-dialog.component';
import { TermsDialogComponent } from '../info-dialogs/terms-dialog/terms-dialog.component';
import { OptionsService } from '../options.service';

@Component({
  selector: 'main-menu-content',
  templateUrl: 'main-menu.html',
  styles: []
})
export class MainMenuComponent implements OnInit {

  constructor(
    public options: OptionsService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
  }

  showAboutDialog() {
    this.dialog.open(AboutDialogComponent);
  }

  showContactDialog() {
    this.dialog.open(ContactDialogComponent);
  }

  showTermsDialog() {
    this.dialog.open(TermsDialogComponent);
  }

}
