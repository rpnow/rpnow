import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { OptionsService } from '../services/options.service';

@Component({
  selector: 'rpn-message',
  template: `
    <ng-container *ngIf="!deleted">
    <div [ngClass]="elementClasses" [style.background-color]="charaColor||''" [style.color]="(charaColor|bw)">

      <div *ngIf="isChara" class="name">{{ charaName }}</div>

      <div class="message-details" *ngIf="!editing && showMessageDetails">
        <ng-container *ngIf="sending">
          <mat-spinner [diameter]="16"></mat-spinner>
        </ng-container>
        <ng-container *ngIf="!sending">
          <rpn-timestamp class="timestamp" [createdAt]="createdAt" [editedAt]="editedAt"></rpn-timestamp>
          <rpn-ipid [style.visibility]="ipidVisibility" [ipid]="ipid"></rpn-ipid>
        </ng-container>
      </div>

      <div *ngIf="canEdit && !sending" class="action-buttons">
        <ng-container *ngIf="!editing">
          <button mat-icon-button (click)="beginEdit()">
            <mat-icon aria-label="Edit post" matTooltip="Edit post">edit</mat-icon>
          </button>
        </ng-container>
        <ng-container *ngIf="editing">
          <button mat-icon-button (click)="confirmDelete()">
            <mat-icon aria-label="Delete message" matTooltip="Delete message">delete</mat-icon>
          </button>
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
            <img [src]="url" (load)="onImageLoaded()"/>
          </a>
        </div>
      </ng-container>

    </div>
    </ng-container>

    <ng-container *ngIf="deleted">
      <div class="deleted-message">
        <span>Message was deleted.</span>
        <a *ngIf="canEdit" href="javascript:;" (click)="onUndelete()">Undo</a>
      </div>
    </ng-container>
  `,
  styleUrls: ['./message.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageComponent {

  @Input() content: string;
  @Input() url: string;
  @Input() type: string;
  @Input() createdAt: number;
  @Input() editedAt: number;
  @Input() ipid: string;
  @Input() deleted: boolean;

  @Input() charaName: string;
  @Input() charaColor: string;

  @Input() canEdit = false;
  @Input() pressEnterToSend = false;
  @Input() showMessageDetails = false;

  @Output() readonly editContent: EventEmitter<string> = new EventEmitter();
  @Output() readonly imageLoaded: EventEmitter<void> = new EventEmitter();
  @Output() readonly delete: EventEmitter<void> = new EventEmitter();
  @Output() readonly undelete: EventEmitter<void> = new EventEmitter();

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

  get ipidVisibility() {
    if (this.ipid && !this.canEdit) {
      return 'visible';
    } else {
      return 'hidden';
    }
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

  confirmDelete() {
    if (!confirm('Delete message?')) return;
    this.editing = false;
    this.delete.emit();
  }

  onUndelete() {
    this.undelete.emit();
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

  onImageLoaded() {
    this.imageLoaded.emit();
  }

}
