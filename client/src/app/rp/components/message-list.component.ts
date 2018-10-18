import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';

@Component({
  selector: 'rpn-message-list',
  template: `
    <div style="padding: 10px 10px 20px">
      <ng-container *ngFor="let msg of messages; trackBy: trackById">

        <rpn-message
          [content]="msg.content"
          [url]="msg.url"
          [type]="msg.type"
          [createdAt]="msg.timestamp"
          [editedAt]="msg.edited"
          [deleted]="msg.deleted"
          [ipid]="msg.ipid"

          [charaName]="charaFor(msg)?.name"
          [charaColor]="charaFor(msg)?.color"

          [canEdit]="canEdit(msg)"
          [pressEnterToSend]="pressEnterToSend"
          [showMessageDetails]="showMessageDetails"

          (editContent)="editMessage(msg._id, $event)"
          (delete)="onDeleteMessage(msg._id)"
          (undelete)="onUndeleteMessage(msg._id)"
          (imageLoaded)="onImageLoaded()"
        ></rpn-message>

        <rpn-nag *ngIf="nags.has(msg._id)"></rpn-nag>

      </ng-container>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListComponent implements OnChanges {

  @Input() messages: RpMessage[];
  @Input() charas: RpChara[];
  @Input() challenge: string;
  @Input() showMessageDetails: boolean;
  @Input() pressEnterToSend: boolean;
  @Input() showNags = false;

  @Output() readonly editMessageContent: EventEmitter<[RpMessageId, string]> = new EventEmitter();
  @Output() readonly deleteMessage: EventEmitter<RpMessageId> = new EventEmitter();
  @Output() readonly undeleteMessage: EventEmitter<RpMessageId> = new EventEmitter();
  @Output() readonly imageLoaded: EventEmitter<void> = new EventEmitter();

  private idsSeen: Set<RpMessageId> = new Set();
  public nags: Set<RpMessageId> = new Set();

  ngOnChanges(changes: SimpleChanges) {
    if (this.showNags) {
      // nag at the bottom upon first load
      if (changes.messages && changes.messages.previousValue == null && changes.messages.currentValue != null) {
        const bottomMessage = this.messages[this.messages.length - 1];
        if (bottomMessage && Math.random() < 0.2) this.nags.add(bottomMessage._id);

        this.messages.forEach(msg => this.idsSeen.add(msg._id));
      }
      // nags periodically later on
      // for (const {_id} of this.messages) {
      //   if (this.idsSeen.has(_id)) continue;

      //   this.idsSeen.add(_id);
      //   if (this.idsSeen.size % 100 === 0) {
      //     this.nags.add(_id);
      //   }
      // }
    }
  }

  trackById(index: number, item: RpMessage) {
    return item._id;
  }

  canEdit(msg: RpMessage) {
    return this.challenge != null && msg.challenge === this.challenge;
  }

  charaFor(msg: RpMessage) {
    return this.charas && (msg.type === 'chara') ? this.charas.find(c => c._id === msg.charaId) : null;
  }

  editMessage(id: RpMessageId, content: string) {
    this.editMessageContent.emit([id, content]);
  }

  onDeleteMessage(id: RpMessageId) {
    this.deleteMessage.emit(id);
  }

  onUndeleteMessage(id: RpMessageId) {
    this.undeleteMessage.emit(id);
  }

  onImageLoaded() {
    this.imageLoaded.emit();
  }

}
