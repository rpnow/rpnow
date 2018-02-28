import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from './rp.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from './main-menu.service';
import { OptionsService } from './options.service';
import { AboutDialogComponent } from './info-dialogs/about-dialog/about-dialog.component';
import { ContactDialogComponent } from './info-dialogs/contact-dialog/contact-dialog.component';
import { TermsDialogComponent } from './info-dialogs/terms-dialog/terms-dialog.component';
import { DOCUMENT } from '@angular/platform-browser';

@Component({
  templateUrl: 'rp.html',
  styles: [],
  providers: [MainMenuService, RpService]
})
export class RpComponent implements OnInit {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  constructor(
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
    this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
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
