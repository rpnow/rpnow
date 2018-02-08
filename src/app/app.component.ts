import { Component, OnInit, ViewChild } from '@angular/core';
import { MainMenuService } from './main-menu.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from './info-dialogs/about-dialog/about-dialog.component';
import { ContactDialogComponent } from './info-dialogs/contact-dialog/contact-dialog.component';
import { TermsDialogComponent } from './info-dialogs/terms-dialog/terms-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  styles: [],
  providers: [MainMenuService]
})
export class AppComponent implements OnInit {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  constructor(
    private mainMenuService: MainMenuService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
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
