import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { RpMessage } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';

@Component({
  selector: 'rp-message-list',
  template: `
    <div style="padding: 10px 10px 20px">
      <rp-message *ngFor="let msg of messages; trackBy: trackById"
        [content]="msg.content"
        [url]="msg.url"
        [type]="msg.type"
        [createdAt]="msg.createdAt"
        [editedAt]="msg.editedAt"
        [ipid]="msg.ipid"

        [charaName]="charaFor(msg)?.name"
        [charaColor]="charaFor(msg)?.color"

        [canEdit]="canEdit(msg)"
        [pressEnterToSend]="pressEnterToSend"
        [showMessageDetails]="showMessageDetails"

        (editContent)="editMessage(msg._id, $event)"
      ></rp-message>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageListComponent {

  @Input() messages: RpMessage[];
  @Input() charas: RpChara[];
  @Input() challenge: string;
  @Input() showMessageDetails: boolean;
  @Input() pressEnterToSend: boolean;

  @Output() editMessageContent: EventEmitter<[string, string]> = new EventEmitter();

  trackById(index: number, item: RpMessage) {
    return item._id;
  }

  canEdit(msg: RpMessage) {
    return msg.challenge === this.challenge;
  }

  charaFor(msg: RpMessage) {
    return this.charas && (msg.type === 'chara') ? this.charas.find(c => c._id === msg.charaId) : null;
  }

  editMessage(id: string, content: string) {
    this.editMessageContent.emit([id, content]);
  }

}
