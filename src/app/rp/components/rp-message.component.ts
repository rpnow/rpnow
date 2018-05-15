import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { OptionsService } from '../services/options.service';

@Component({
  selector: 'rp-message',
  template: `
    <div [ngClass]="elementClasses" [style.background-color]="charaColor||''" [style.color]="(charaColor|bw)">
        <div *ngIf="isChara" class="name">{{charaName}}</div>

        <div class="message-details" *ngIf="!editing && showMessageDetails">
            <ng-container *ngIf="sending">
                <mat-spinner [diameter]="16"></mat-spinner>
            </ng-container>
            <ng-container *ngIf="!sending">
                <span class="timestamp" [timeAgo]="createdAt" [timeAgoEdited]="editedAt"></span>
                <ipid *ngIf="ipid && canEdit" [ipid]="ipid"></ipid>
            </ng-container>
        </div>

        <div *ngIf="canEdit && !sending" class="action-buttons">
            <ng-container *ngIf="!editing">
                <button mat-icon-button (click)="beginEdit()">
                    <mat-icon aria-label="Edit post" matTooltip="Edit post">edit</mat-icon>
                </button>
            </ng-container>
            <ng-container *ngIf="editing">
                <button mat-icon-button [disabled]="!validEdit()" (click)="confirmEdit()">
                    <mat-icon aria-label="Save edits" matTooltip="Save edits">save</mat-icon>
                </button>
                <button mat-icon-button (click)="cancelEdit()">
                    <mat-icon aria-label="Discard edits" matTooltip="Discard edits">cancel</mat-icon>
                </button>
            </ng-container>
        </div>

        <ng-container *ngIf="type !== 'image' && !editing">
            <div class="content generated-links" [innerHtml]="content|msgFormat:charaColor"></div>
        </ng-container>

        <ng-container *ngIf="editing">
            <textarea class="content" [(ngModel)]="newContent" maxlength="10000" rows="4" (keypress)="keypressCheckEnter($event)"></textarea>
        </ng-container>

        <ng-container *ngIf="type === 'image'">
            <div class="content">
                <a [href]="url" target="_blank">
                    <img [src]="url"/>
                </a>
            </div>
        </ng-container>
    </div>
  `,
  styleUrls: ['rp-message.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpMessageComponent {

  @Input() content: string;
  @Input() url: string;
  @Input() type: string;
  @Input() createdAt: number;
  @Input() editedAt: number;
  @Input() ipid: string;

  @Input() charaName: string;
  @Input() charaColor: string;

  @Input() canEdit = false;
  @Input() pressEnterToSend = false;
  @Input() showMessageDetails = false;

  @Output() editContent: EventEmitter<string> = new EventEmitter();

  editing = false;
  newContent = '';
  sending = false;

  get isNarrator() {
    return this.type === 'narrator';
  }

  get isOOC() {
    return this.type === 'ooc';
  }

  get isChara() {
    return this.type === 'chara';
  }

  get elementClasses() {
    return {
      'message': true,
      ['message-' + this.type]: true,
      'message-sending': this.sending,
      'message-slim': false
    };
  }

  beginEdit() {
    this.editing = true;
    this.newContent = this.content;
  }

  cancelEdit() {
    this.editing = false;
  }

  validEdit() {
    return this.newContent.trim() && this.newContent !== this.content;
  }

  confirmEdit() {
    this.editing = false;
    this.editContent.emit(this.newContent);
    // TODO when do we set? this.sending = true and false;
  }

  keypressCheckEnter($event: KeyboardEvent) {
    const keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.pressEnterToSend || $event.ctrlKey) {
      this.confirmEdit();
      return false;
    }
  }

}
