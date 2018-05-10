import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { OptionsService } from '../services/options.service';

@Component({
  selector: 'app-new-chara',
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

        <h3 mat-dialog-title fxFlex>New Character</h3>

        <button mat-icon-button mat-dialog-title mat-dialog-close>
            <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
        </button>

    </div>

    <mat-form-field>
        <input matInput maxlength="30" placeholder="Name this character:" [(ngModel)]="name" cdkFocusInitial>
    </mat-form-field>

    <span [(colorPicker)]="color" [cpToggle]="true" cpDialogDisplay="inline" [cpDisableInput]="true"></span>

    <mat-dialog-actions>
        <button mat-raised-button [disabled]="!valid" [style.background-color]="submitButtonColor" [style.color]="submitButtonColor|bw" (click)="submit()">OK</button>
        <button mat-raised-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDialogComponent implements OnInit {

  name: string = '';
  color: string = '#556677';

  constructor(
    private dialogRef: MatDialogRef<CharaDialogComponent>,
    private options: OptionsService
  ) { }

  ngOnInit() {
    this.color = this.options.lastColor;
  }

  get valid() {
    return this.name.trim() && this.color;
  }

  get submitButtonColor() {
    return this.valid ? this.color : null;
  }

  submit() {
    if (!this.valid) return;

    this.options.lastColor = this.color;

    this.dialogRef.close({name: this.name, color: this.color});
  }

}
