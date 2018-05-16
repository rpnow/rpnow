import { Component, ChangeDetectionStrategy, EventEmitter, Output, Input, ViewContainerRef } from '@angular/core';
import { RpChara } from '../models/rp-chara';
import { RpVoice } from '../models/rp-voice';
import { MatDialog } from '@angular/material/dialog';
import { CharaDialogComponent } from './chara-dialog.component';

@Component({
  selector: 'rpn-chara-drawer-contents',
  template: `
    <div fxFill fxLayout="column">

        <mat-toolbar class="flat-toolbar">

            <h1 fxFlex>
                Characters
            </h1>

            <button mat-icon-button (click)="close()">
                <mat-icon aria-label="Close character menu" matTooltip="Close">close</mat-icon>
            </button>

        </mat-toolbar>

        <mat-nav-list class="flex-scroll-container">
            <a mat-list-item (click)="onSetVoice('narrator')">
                <mat-icon mat-list-icon>local_library</mat-icon>
                <p mat-line>Narrator</p>
                <mat-icon *ngIf="isNarratorSelected">check</mat-icon>
            </a>
            <a mat-list-item (click)="onSetVoice('ooc')">
                <mat-icon mat-list-icon>chat</mat-icon>
                <p mat-line>Out of Character</p>
                <mat-icon *ngIf="isOocSelected">check</mat-icon>
            </a>

            <mat-divider></mat-divider>

            <a mat-list-item (click)="onNewChara()">
                <mat-icon mat-list-icon>person_add</mat-icon>
                <p mat-line>New Character...</p>
            </a>

            <mat-divider></mat-divider>

            <ng-container *ngIf="hasManyCharacters()">

                <h3 matSubheader>Recent</h3>

                <a mat-list-item *ngFor="let chara of recentCharas; trackBy: trackById" (click)="onSetVoice(chara)">
                    <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
                    <p mat-line>{{chara.name}}</p>
                    <mat-icon *ngIf="isCharaSelected(chara)">check</mat-icon>
                </a>

                <mat-divider></mat-divider>

            </ng-container>

            <h3 matSubheader *ngIf="hasManyCharacters()">All Characters</h3>

            <a mat-list-item *ngFor="let chara of charas; trackBy: trackById" (click)="onSetVoice(chara)">
                <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
                <p mat-line>{{chara.name}}</p>
                <mat-icon *ngIf="isCharaSelected(chara)">check</mat-icon>
            </a>

        </mat-nav-list>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDrawerComponent {

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  @Input() charas: RpChara[];
  @Input() recentCharas: RpChara[];
  @Input() currentChara: RpVoice;

  @Output() closeDrawer: EventEmitter<void> = new EventEmitter();
  @Output() setVoice: EventEmitter<RpVoice> = new EventEmitter();
  @Output() newChara: EventEmitter<{name: string, color: string}> = new EventEmitter();

  get isNarratorSelected() {
      return this.currentChara === 'narrator';
  }

  get isOocSelected() {
      return this.currentChara === 'ooc';
  }

  isCharaSelected(chara: RpChara) {
    return (typeof this.currentChara !== 'string') && (this.currentChara._id === chara._id);
  }

  hasManyCharacters() {
    return this.charas && this.charas.length >= 10;
  }

  onSetVoice(voice: RpVoice) {
    this.setVoice.emit(voice);
  }

  onNewChara() {
    const dialogRef = this.dialog.open(CharaDialogComponent, { viewContainerRef: this.viewContainerRef });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.newChara.emit(chara);
    });
  }

  close() {
    this.closeDrawer.emit();
  }

  trackById(index: number, item: RpChara) {
    return item._id;
  }

}
