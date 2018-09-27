import { Component, ChangeDetectionStrategy, EventEmitter, Output, Input, ViewContainerRef } from '@angular/core';
import { RpChara, RpCharaId } from '../models/rp-chara';
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
      <a mat-list-item [class.chara-selected]="isNarratorSelected" (click)="onSetVoice('narrator')">
        <mat-icon mat-list-icon>local_library</mat-icon>
        <p mat-line>Narrator</p>
      </a>
      <a mat-list-item [class.chara-selected]="isOocSelected" (click)="onSetVoice('ooc')">
        <mat-icon mat-list-icon>chat</mat-icon>
        <p mat-line>Out of Character</p>
      </a>

      <mat-divider></mat-divider>

      <a mat-list-item (click)="onNewChara()">
        <mat-icon mat-list-icon>person_add</mat-icon>
        <p mat-line>New Character...</p>
      </a>

      <mat-divider></mat-divider>

      <ng-container *ngIf="hasManyCharas()">

        <h3 matSubheader>Recent</h3>

        <a mat-list-item *ngFor="let chara of recentCharas; trackBy: trackById" [class.chara-selected]="isCharaSelected(chara)" (click)="onSetVoice(chara)">
          <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
          <p mat-line>{{ chara.name }}</p>
          <button mat-icon-button (click)="onEditChara(chara); $event.stopPropagation()">
            <mat-icon *ngIf="canEdit(chara)">edit</mat-icon>
          </button>
        </a>

        <mat-divider></mat-divider>

      </ng-container>

      <h3 matSubheader *ngIf="hasManyCharas()">All Characters</h3>

      <a mat-list-item *ngFor="let chara of charas; trackBy: trackById" [class.chara-selected]="isCharaSelected(chara)" (click)="onSetVoice(chara)">
        <mat-icon mat-list-icon [rpnIconColor]="chara.color">person</mat-icon>
        <p mat-line>{{ chara.name }}</p>
        <button mat-icon-button (click)="onEditChara(chara); $event.stopPropagation()">
          <mat-icon *ngIf="canEdit(chara)">edit</mat-icon>
        </button>
      </a>

    </mat-nav-list>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    :host-context(.mat-drawer-side) {
      background-color: #f5f5f5;
    }
    :host-context(.dark-theme .mat-drawer-side) {
      background-color: #2c2c2c;
    }
    h1 {
      flex: 1 1 auto;
    }
    .mat-list-item.chara-selected {
      border-left: solid;
      background-color: rgba(0,0,0,0.02);
    }
    :host-context(.dark-theme) .mat-list-item.chara-selected {
      background-color: rgba(255,255,255,0.02);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDrawerComponent {

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  charas: RpChara[];
  recentCharas: RpChara[];

  @Input() currentChara: RpVoice;
  @Input() isInline: boolean;
  @Input() challenge: string;

  @Output() readonly closeDrawer: EventEmitter<void> = new EventEmitter();
  @Output() readonly setVoice: EventEmitter<RpVoice> = new EventEmitter();
  @Output() readonly newChara: EventEmitter<{name: string, color: string}> = new EventEmitter();
  @Output() readonly editChara: EventEmitter<{id: RpCharaId, name: string, color: string}> = new EventEmitter();

  @Input('charas') set _charas(charas: RpChara[]) {
    this.charas = (charas != null) ? [...charas].sort(this.nameSorter) : null;
  }
  @Input('recentCharas') set _recentCharas(charas: RpChara[]) {
    this.recentCharas = (charas != null) ? [...charas].sort(this.nameSorter) : null;
  }

  private readonly nameSorter = (a, b) => a.name.localeCompare(b.name);

  get isNarratorSelected() {
    return this.currentChara === 'narrator';
  }

  get isOocSelected() {
    return this.currentChara === 'ooc';
  }

  isCharaSelected(chara: RpChara) {
    return (typeof this.currentChara !== 'string') && (this.currentChara._id === chara._id);
  }

  canEdit(chara: RpChara) {
    return this.challenge != null && chara.challenge === this.challenge;
  }

  hasManyCharas() {
    return this.charas && this.charas.length >= 10 && this.recentCharas && this.recentCharas.length > 0;
  }

  onSetVoice(voice: RpVoice) {
    this.setVoice.emit(voice);
  }

  onNewChara() {
    const dialogRef = this.dialog.open(CharaDialogComponent, {
      viewContainerRef: this.viewContainerRef,
      data: { edit: false },
    });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.newChara.emit(chara);
    });
  }

  onEditChara(chara: RpChara) {
    const dialogRef = this.dialog.open(CharaDialogComponent, {
      viewContainerRef: this.viewContainerRef,
      data: { edit: true, name: chara.name, color: chara.color },
    });
    dialogRef.beforeClose().subscribe(editedChara => {
      if (editedChara) this.editChara.emit({ ...editedChara, id: chara._id });
    });
  }

  close() {
    this.closeDrawer.emit();
  }

  trackById(index: number, item: RpChara) {
    return item._id;
  }

}
