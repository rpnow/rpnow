import { Component, OnInit, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from '../COMPONENTS/about-dialog.component';
import { ContactDialogComponent } from '../COMPONENTS/contact-dialog.component';
import { TermsDialogComponent } from '../COMPONENTS/terms-dialog.component';
import { OptionsService } from '../services/options.service';
import { OptionsDialogComponent } from '../options-dialog/options-dialog.component';
import { MainMenuService } from '../main-menu.service';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';
import { RpService } from '../services/rp.service';

@Component({
  selector: 'main-menu-content',
  templateUrl: 'main-menu.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainMenuComponent implements OnInit {

  constructor(
    public rp: RpService,
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
