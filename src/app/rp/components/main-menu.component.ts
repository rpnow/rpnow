import { Component, ViewContainerRef, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AboutDialogComponent } from './about-dialog.component';
import { ContactDialogComponent } from './contact-dialog.component';
import { OptionsDialogComponent } from './options-dialog.component';
import { DownloadDialogComponent } from './download-dialog.component';

@Component({
  selector: 'rpn-main-menu-content',
  template: `
    <mat-toolbar class="flat-toolbar">
      <h1>
        RPNow
      </h1>
      <button mat-icon-button (click)="onClose()">
        <mat-icon aria-label="Close character menu" matTooltip="Close">close</mat-icon>
      </button>
    </mat-toolbar>
    <mat-nav-list class="flex-scroll-container">

      <h3 matSubheader style="display:block;overflow:hidden;text-overflow:ellipsis">{{ rpTitle }}</h3>

      <a mat-list-item routerLink="." (click)="onClose()">
        <mat-icon mat-list-icon>question_answer</mat-icon>
        <p mat-line>Chat</p>
      </a>

      <a mat-list-item routerLink="./1" (click)="onClose()">
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

      <a mat-list-item href="/terms" target="_blank" title="Terms of use and privacy information for using RPNow">
        <mat-icon mat-list-icon>account_balance</mat-icon>
        <p mat-line>Terms &amp; Privacy</p>
      </a>

    </mat-nav-list>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    h1 {
      flex: 1 1 auto;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainMenuComponent {

  @Input() rpTitle: string;

  @Output() readonly closeMenu: EventEmitter<void> = new EventEmitter();

  constructor(
    private dialog: MatDialog,
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

  showOptionsDialog() {
    this.dialog.open(OptionsDialogComponent, { viewContainerRef: this.viewContainerRef });
  }

  onClose() {
    this.closeMenu.emit();
  }

}
