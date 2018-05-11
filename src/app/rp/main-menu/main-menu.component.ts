import { Component, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from '../COMPONENTS/about-dialog.component';
import { ContactDialogComponent } from '../COMPONENTS/contact-dialog.component';
import { TermsDialogComponent } from '../COMPONENTS/terms-dialog.component';
import { OptionsService } from '../services/options.service';
import { OptionsDialogComponent } from '../COMPONENTS/options-dialog.component';
import { MainMenuService } from '../main-menu.service';
import { DownloadDialogComponent } from '../COMPONENTS/download-dialog.component';
import { RpService } from '../services/rp.service';

@Component({
  selector: 'main-menu-content',
  template: `
    <div fxFill fxLayout="column">
        <mat-toolbar class="flat-toolbar">
            <h1 fxFlex>
                RPNow
            </h1>
            <button mat-icon-button (click)="close()">
                <mat-icon aria-label="Close character menu" matTooltip="Close">close</mat-icon>
            </button>
        </mat-toolbar>
        <mat-nav-list class="flex-scroll-container">

            <h3 matSubheader>{{rp.title}}</h3>

            <a mat-list-item [routerLink]="'/rp/'+rp.rpCode" (click)="close()">
                <mat-icon mat-list-icon>question_answer</mat-icon>
                <p mat-line>Chat</p>
            </a>

            <a mat-list-item [routerLink]="'/rp/'+rp.rpCode+'/1'" (click)="close()">
                <mat-icon mat-list-icon>import_contacts</mat-icon>
                <p mat-line>Archive</p>
            </a>

            <a mat-list-item (click)="openDownloadDialog()">
                <mat-icon mat-list-icon>cloud_download</mat-icon>
                <p mat-line>Download</p>
            </a>

            <mat-divider></mat-divider>

            <h3 matSubheader>Options</h3>

            <a mat-list-item (click)="showOptionsDialog()" title="Options for how you experience RPNow">
                <mat-icon mat-list-icon>settings</mat-icon>
                <p mat-line>Preferences</p>
            </a>

            <mat-divider></mat-divider>

            <h3 matSubheader>RPNow</h3>

            <a mat-list-item routerLink="/" title="Return to the homepage to create a new RP">
                <mat-icon mat-list-icon>note_add</mat-icon>
                <p mat-line>Create new RP</p>
            </a>

            <a mat-list-item (click)="showContactDialog()" title="Get in touch with RPNow administration and support">
                <mat-icon mat-list-icon>help</mat-icon>
                <p mat-line>Contact RPNow</p>
            </a>

            <a mat-list-item (click)="showAboutDialog()" title="Get to know us!">
                <mat-icon mat-list-icon>mood</mat-icon>
                <p mat-line>About us</p>
            </a>

            <a mat-list-item href="https://www.patreon.com/rpnow" target="_blank" title="Every dollar is appreciated  :D">
                <mat-icon mat-list-icon>favorite</mat-icon>
                <p mat-line>Donate @ Patreon</p>
            </a>

            <a mat-list-item (click)="showTermsDialog()" title="Terms of use and privacy information for using RPNow">
                <mat-icon mat-list-icon>account_balance</mat-icon>
                <p mat-line>Terms &amp; Privacy</p>
            </a>

        </mat-nav-list>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainMenuComponent {

  constructor(
    public rp: RpService,
    private dialog: MatDialog,
    private mainMenu: MainMenuService,
    private viewContainerRef: ViewContainerRef
  ) { }

  openDownloadDialog() {
    this.dialog.open(DownloadDialogComponent, { viewContainerRef: this.viewContainerRef });
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
