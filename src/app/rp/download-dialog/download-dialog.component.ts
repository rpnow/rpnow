import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Rp } from '../../rp.service';
import { DownloadTxtService } from './download-txt.service';
import { DownloadDocxService } from './download-docx.service';
import { OptionsService } from '../../options.service';

@Component({
  selector: 'app-download-dialog',
  templateUrl: 'download-dialog.html',
  styles: [],
  providers: [DownloadDocxService, DownloadTxtService]
})
export class DownloadDialogComponent {

  constructor(
    private dialogRef: MatDialogRef<DownloadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { rp: Rp },
    private txtService: DownloadTxtService,
    private docxService: DownloadDocxService,
    public options: OptionsService
  ) { }

  cancel() {
    this.dialogRef.close(null);
  }
  
  printTxt() {
    this.txtService.downloadTxt(this.data.rp, this.options.downloadOOC);
  }

  printDocx() {
    this.docxService.downloadDocx(this.data.rp, this.options.downloadOOC);
  }

}
