import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
// import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  template: `
    <div id="dialog-header">

      <h3 mat-dialog-title>Post Image</h3>

      <button mat-icon-button mat-dialog-title mat-dialog-close>
        <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
      </button>

    </div>

    <ng-container *ngIf="!loading">

      <mat-form-field>
        <input matInput placeholder="Enter a URL:" [(ngModel)]="url" cdkFocusInitial (keyup.enter)="submit()">
      </mat-form-field>

      <div id="image-container">
        <img [src]="url">
      </div>

      <mat-dialog-actions>
        <button mat-raised-button [disabled]="!valid()" color="primary" (click)="submit()">OK</button>
        <button mat-raised-button mat-dialog-close>Cancel</button>
      </mat-dialog-actions>

    </ng-container>

    <ng-container *ngIf="loading">
      <mat-spinner></mat-spinner>
    </ng-container>
  `,
  styles: [`
    #dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #image-container {
      background-image:
        linear-gradient(45deg, rgba(0,0,0,0.2) 25%, rgba(255,255,255,0.2) 25%),
        linear-gradient(-45deg, rgba(0,0,0,0.2) 25%, rgba(255,255,255,0.2) 25%),
        linear-gradient(45deg, rgba(255,255,255,0.2) 75%, rgba(0,0,0,0.2) 75%),
        linear-gradient(-45deg, rgba(255,255,255,0.2) 75%, rgba(0,0,0,0.2) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;

      width: 300px;
      max-width: 100%;
      height: 200px;

      display: flex;
    }
    #image-container img {
      max-width: 100%;
      max-height: 100%;
      margin: auto;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageDialogComponent {

  // https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
  private urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;

  loading = false;

  url = '';

  constructor(
    private dialogRef: MatDialogRef<ImageDialogComponent>
    // private snackbar: MatSnackBar
  ) { }

  valid() {
    return this.url.match(this.urlRegex);
  }

  submit() {
    if (!this.valid()) return;

    this.loading = true;

    // TODO we need to actually validate whether the upload succeeds rather than just closing the dialog!
    setTimeout(() => {
      this.dialogRef.close(this.url);
    }, 250);

    // if we upload a bad image, we might use this logic:
      // this.snackbar.open("Invalid image URL. Make sure it's correct or try a different image.", 'Close', {duration:5000, verticalPosition:'top'});
      // this.loading = false;
  }

}

