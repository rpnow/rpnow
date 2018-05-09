import { Component, ChangeDetectionStrategy, EventEmitter, Output, Input } from '@angular/core';
import { RpChara } from '../models/rp-chara';
import { RpVoice } from '../models/rp-voice';

@Component({
  selector: 'chara-drawer-contents',
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
            <a mat-list-item (click)="setVoice('narrator')">
                <mat-icon mat-list-icon>local_library</mat-icon>
                <p mat-line>Narrator</p>
                <mat-icon *ngIf="currentChara === 'narrator'">check</mat-icon>
            </a>
            <a mat-list-item (click)="setVoice('ooc')">
                <mat-icon mat-list-icon>chat</mat-icon>
                <p mat-line>Out of Character</p>
                <mat-icon *ngIf="currentChara === 'ooc'">check</mat-icon>
            </a>

            <mat-divider></mat-divider>

            <a mat-list-item (click)="newChara()">
                <mat-icon mat-list-icon>person_add</mat-icon>
                <p mat-line>New Character...</p>
            </a>

            <mat-divider></mat-divider>

            <ng-container *ngIf="hasManyCharacters()">

                <h3 matSubheader>Recent</h3>

                <a mat-list-item *ngFor="let chara of recentCharas; trackBy: rp.trackById" (click)="setVoice(chara)">
                    <mat-icon mat-list-icon [charaIconColor]="chara.color">person</mat-icon>
                    <p mat-line>{{chara.name}}</p>
                    <mat-icon *ngIf="currentChara._id === chara._id">check</mat-icon>
                </a>

                <mat-divider></mat-divider>

            </ng-container>

            <h3 matSubheader *ngIf="hasManyCharacters()">All Characters</h3>

            <a mat-list-item *ngFor="let chara of charas; trackBy: trackById" (click)="setVoice(chara)">
                <mat-icon mat-list-icon [charaIconColor]="chara.color">person</mat-icon>
                <p mat-line>{{chara.name}}</p>
                <mat-icon *ngIf="currentChara._id === chara._id">check</mat-icon>
            </a>

        </mat-nav-list>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDrawerComponent {

  @Input() charas: RpChara[];
  @Input() recentCharas: RpChara[];
  @Input() currentChara: RpVoice;

  @Output() closeDrawer: EventEmitter<void> = new EventEmitter();
  @Output() onSetVoice: EventEmitter<RpVoice> = new EventEmitter();
  @Output() openCharaCreator: EventEmitter<void> = new EventEmitter();

  hasManyCharacters() {
    return this.charas && this.charas.length >= 10;
  }

  setVoice(voice: RpVoice) {
    this.onSetVoice.emit(voice);
  }

  newChara() {
    this.openCharaCreator.emit();
  }

  close() {
    this.closeDrawer.emit();
  }

  trackById(index: number, item: RpChara) {
    return item._id;
  }

}
