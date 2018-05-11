import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
// import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-image-dialog',
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

        <h3 mat-dialog-title fxFlex>Post Image</h3>

        <button mat-icon-button mat-dialog-title mat-dialog-close>
            <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
        </button>

    </div>

    <ng-container *ngIf="!loading">

        <mat-form-field>
            <input matInput placeholder="Enter a URL:" [(ngModel)]="url" cdkFocusInitial (keyup.enter)="submit()">
        </mat-form-field>

        <mat-dialog-actions>
            <button mat-raised-button [disabled]="!valid()" color="primary" (click)="submit()">OK</button>
            <button mat-raised-button mat-dialog-close>Cancel</button>
        </mat-dialog-actions>

    </ng-container>

    <ng-container *ngIf="loading">
        <mat-spinner></mat-spinner>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageDialogComponent {

  //https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
  private urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;

  loading: boolean = false;

  url: string = '';

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

    // eventually we will upload an image and return its url
    setTimeout(() => {
      this.dialogRef.close(this.url);
    }, 250)

    // if we upload a bad image, we might use this logic:
      // this.snackbar.open("Invalid image URL. Make sure it's correct or try a different image.", 'Close', {duration:5000, verticalPosition:'top'});
      // this.loading = false;
  }

}

