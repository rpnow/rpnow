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

    <mat-form-field>
      <input id="url-input" matInput placeholder="Enter a URL:" [(ngModel)]="url" (ngModelChange)="this.updateUrl($event)" cdkFocusInitial (keyup.enter)="submit()">
    </mat-form-field>

    <div id="image-container-busted" *ngIf="(valid|async) !== true && (valid|async) !== false">
      <mat-spinner></mat-spinner>
    </div>

    <div id="image-container" *ngIf="(valid|async) === true">
      <img [src]="url">
    </div>

    <div id="image-container-busted" *ngIf="(valid|async) === false">
      <span *ngIf="url.length > 0 && !isWellFormed(url)">RPNow can't read this URL.</span>
      <span *ngIf="isWellFormed(url)">Can't load this image.</span>
    </div>

    <mat-dialog-actions>
      <button mat-raised-button [disabled]="(valid|async) !== true" color="primary" (click)="submit()">OK</button>
      <button mat-raised-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-form-field {
      width: 300px;
      max-width: 100%;
    }
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
    #image-container-busted {
      width: 300px;
      max-width: 100%;
      height: 200px;

      display: flex;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageDialogComponent {

  // https://github.com/angular/angular.js/blob/master/src/ngSanitize/filter/linky.js#L3
  private urlRegex = /^((ftp|https?):\/\/|(www\.)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]$/gi;

  url = '';
  valid = Promise.resolve(false);

  constructor(
    private dialogRef: MatDialogRef<ImageDialogComponent>
    // private snackbar: MatSnackBar
  ) { }

  updateUrl(url) {
    this.valid = this.isValid(url);
  }

  isWellFormed(url: string) {
    return !!url.match(this.urlRegex);
  }

  private async isValid(url: string) {
    if (!this.isWellFormed(url)) return false;

    return new Promise<boolean>(resolve => {
      const img = document.createElement('img');

      img.addEventListener('load', () => resolve(true));
      img.addEventListener('error', () => resolve(false));
      img.addEventListener('abort', () => resolve(false));
      setTimeout(() => resolve(false), 45000);

      img.src = url;
    });
  }

  submit() {
    this.dialogRef.close(this.url);
  }

}

