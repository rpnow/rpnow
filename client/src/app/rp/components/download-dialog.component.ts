import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { DownloadTxtService } from '../services/download-txt.service';
import { DownloadDocxService } from '../services/download-docx.service';
import { OptionsService } from '../services/options.service';

@Component({
  /*
  template: `
    <div id="dialog-header">
      <h3 mat-dialog-title>Download RP</h3>

      <button mat-icon-button mat-dialog-title mat-dialog-close>
        <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
      </button>
    </div>

    <mat-checkbox [(ngModel)]="downloadOOC">Include OOC messages</mat-checkbox>

    <mat-dialog-actions>
      <button mat-raised-button color="primary" (click)="printTxt()">
        <mat-icon>file_download</mat-icon>
        .TXT
      </button>
      <button mat-raised-button color="primary" (click)="printDocx()">
        <mat-icon>file_download</mat-icon>
        .DOCX
      </button>
    </mat-dialog-actions>
  `,*/
  template: `
    <div id="dialog-header">
      <h3 mat-dialog-title>Download RP</h3>

      <button mat-icon-button mat-dialog-title mat-dialog-close>
        <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
      </button>
    </div>

    The RP download function is currently broken. It will hopefully be fixed by the end of August.
  `,
  styles: [`
    #dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `],
  providers: [DownloadDocxService, DownloadTxtService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DownloadDialogComponent {

  downloadOOC = false;

  constructor(
    private txtService: DownloadTxtService,
    private docxService: DownloadDocxService
  ) { }

  printTxt() {
    this.txtService.downloadTxt(this.downloadOOC);
  }

  printDocx() {
    this.docxService.downloadDocx(this.downloadOOC);
  }

}
