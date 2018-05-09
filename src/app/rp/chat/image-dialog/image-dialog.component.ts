import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { RpService } from '../../services/rp.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-image-dialog',
  templateUrl: 'image-dialog.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageDialogComponent {

  //https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
  private urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;

  loading: boolean = false;

  url: string = '';

  constructor(
    public rp: RpService,
    private dialogRef: MatDialogRef<ImageDialogComponent>,
    private snackbar: MatSnackBar
  ) { }

  ngOnInit() {
  }

  valid() {
    return this.url.match(this.urlRegex);
  }

  async submit() {
    if (!this.valid()) return;

    this.loading = true;

    try {
      await this.rp.addImage(this.url);
      this.dialogRef.close();
    }
    catch (ex) {
      this.snackbar.open("Invalid image URL. Make sure it's correct or try a different image.", 'Close', {duration:5000, verticalPosition:'top'});
      this.loading = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }

}

