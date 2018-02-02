import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Rp } from '../../rp.service';
import { downloadTxt } from '../../download-functions/download-txt';
import { DownloadDocxService } from './download-docx.service';

@Component({
  selector: 'app-download-dialog',
  templateUrl: 'download-dialog.html',
  styles: [],
  providers: [DownloadDocxService]
})
export class DownloadDialogComponent implements OnInit {

  public showOOC: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<DownloadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { rp: Rp },
    private docxService: DownloadDocxService
  ) { }

  ngOnInit() {
  }

  cancel() {
    this.dialogRef.close(null);
  }
  
  printTxt() {
    downloadTxt(this.data.rp, this.showOOC);
  }

  printDocx() {
    this.docxService.downloadDocx(this.data.rp, this.showOOC);
  }

}
