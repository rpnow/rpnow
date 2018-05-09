import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { OptionsService } from '../../services/options.service';
import { RpService } from '../../services/rp.service';

@Component({
  selector: 'app-new-chara',
  template: `
    <div fxLayout="row" fxLayoutAlign="center center">

        <h3 mat-dialog-title fxFlex>New Character</h3>

        <button mat-icon-button mat-dialog-title mat-dialog-close>
            <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
        </button>

    </div>

    <ng-container *ngIf="!loading">
        <mat-form-field>
            <input matInput maxlength="30" placeholder="Name this character:" [(ngModel)]="name" cdkFocusInitial>
        </mat-form-field>

        <span [(colorPicker)]="color" [cpToggle]="true" cpDialogDisplay="inline" [cpDisableInput]="true"></span>

        <mat-dialog-actions>
            <button mat-raised-button [disabled]="!valid()" [style.background-color]="submitButtonColor()" [style.color]="submitButtonColor()|bw" (click)="submit()">OK</button>
            <button mat-raised-button mat-dialog-close>Cancel</button>
        </mat-dialog-actions>
    </ng-container>

    <ng-container *ngIf="loading">
        <mat-spinner></mat-spinner>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewCharaComponent implements OnInit {

  loading: boolean = false;

  name: string = '';
  color: string = '#556677';

  constructor(
    public rp: RpService,
    private dialogRef: MatDialogRef<NewCharaComponent>,
    private options: OptionsService
  ) { }

  ngOnInit() {
    this.color = this.options.lastColor;
  }

  valid() {
    return this.name.trim() && this.color;
  }

  submitButtonColor() {
    return this.valid() ? this.color : null;
  }

  async submit() {
    if (!this.valid()) return;

    this.loading = true;

    this.options.lastColor = this.color;

    let chara = await this.rp.addChara(this.name, this.color);
    this.dialogRef.close(chara);
  }

}
