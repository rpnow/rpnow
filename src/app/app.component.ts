import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { MainMenuService } from './main-menu.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from './info-dialogs/about-dialog/about-dialog.component';
import { ContactDialogComponent } from './info-dialogs/contact-dialog/contact-dialog.component';
import { TermsDialogComponent } from './info-dialogs/terms-dialog/terms-dialog.component';
import { OptionsService } from './options.service';

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
    private dialog: MatDialog,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
    this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : 'light-theme';
    })
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
