import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from '../info-dialogs/about-dialog/about-dialog.component';
import { ContactDialogComponent } from '../info-dialogs/contact-dialog/contact-dialog.component';
import { TermsDialogComponent } from '../info-dialogs/terms-dialog/terms-dialog.component';
import { OptionsService } from '../options.service';
import { OptionsDialogComponent } from '../options-dialog/options-dialog.component';
import { MainMenuService } from '../main-menu.service';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';
import { RpService } from '../rp.service';

@Component({
  selector: 'main-menu-content',
  templateUrl: 'main-menu.html',
  styles: []
})
export class MainMenuComponent implements OnInit {

  constructor(
    private rp: RpService,
    private dialog: MatDialog,
    private mainMenu: MainMenuService,
    private viewContainerRef: ViewContainerRef
  ) { }

  ngOnInit() {
  }

  openDownloadDialog() {
    let dialogRef = this.dialog.open(DownloadDialogComponent, { viewContainerRef: this.viewContainerRef });
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

  showOptionsDialog() {
    this.dialog.open(OptionsDialogComponent, { viewContainerRef: this.viewContainerRef });
  }

  close() {
    this.mainMenu.menu.close();
  }

}
