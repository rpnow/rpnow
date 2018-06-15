import { Component, ChangeDetectionStrategy, EventEmitter, Output, Input, ViewContainerRef, HostBinding } from '@angular/core';
import { RpChara } from '../models/rp-chara';
import { RpVoice } from '../models/rp-voice';
import { MatDialog } from '@angular/material/dialog';
import { CharaDialogComponent } from './chara-dialog.component';

@Component({
  selector: 'rpn-chara-drawer-contents',
  template: `
    <mat-toolbar class="flat-toolbar" [class.shadow-toolbar]="isInline">

      <h1>Characters</h1>

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

      <ng-container *ngIf="hasManyCharas()">

        <h3 matSubheader>Recent</h3>

        <a mat-list-item *ngFor="let chara of recentCharas; trackBy: trackById" (click)="onSetVoice(chara)">
          <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
          <p mat-line>{{ chara.name }}</p>
          <mat-icon *ngIf="isCharaSelected(chara)">check</mat-icon>
        </a>

        <mat-divider></mat-divider>

      </ng-container>

      <h3 matSubheader *ngIf="hasManyCharas()">All Characters</h3>

      <a mat-list-item *ngFor="let chara of charas; trackBy: trackById" (click)="onSetVoice(chara)">
        <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
        <p mat-line>{{ chara.name }}</p>
        <mat-icon *ngIf="isCharaSelected(chara)">check</mat-icon>
      </a>

    </mat-nav-list>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    h1 {
      flex: 1 1 auto;
    }
  `],
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
  @Input() isInline: boolean;

  @Output() readonly closeDrawer: EventEmitter<void> = new EventEmitter();
  @Output() readonly setVoice: EventEmitter<RpVoice> = new EventEmitter();
  @Output() readonly newChara: EventEmitter<{name: string, color: string}> = new EventEmitter();

  @HostBinding('style.background-color') get _backgroundColor() {
    return this.isInline ? '#f5f5f5' : '';
  }

  get isNarratorSelected() {
    return this.currentChara === 'narrator';
  }

  get isOocSelected() {
    return this.currentChara === 'ooc';
  }

  isCharaSelected(chara: RpChara) {
    return (typeof this.currentChara !== 'string') && (this.currentChara.id === chara.id);
  }

  hasManyCharas() {
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
    return item.id;
  }

}
