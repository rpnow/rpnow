import { Component, OnInit, ChangeDetectionStrategy, Input, EventEmitter, Output, OnChanges } from '@angular/core';
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
          [ipid]="msg.ipid"

          [charaName]="charaFor(msg)?.name"
          [charaColor]="charaFor(msg)?.color"

          [canEdit]="canEdit(msg)"
          [pressEnterToSend]="pressEnterToSend"
          [showMessageDetails]="showMessageDetails"

          (editContent)="editMessage(msg.id, $event)"
          (imageLoaded)="onImageLoaded()"
        ></rpn-message>

        <rpn-nag *ngIf="nags.has(msg.id)"></rpn-nag>

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

  @Output() readonly editMessageContent: EventEmitter<[string, string]> = new EventEmitter();
  @Output() readonly imageLoaded: EventEmitter<void> = new EventEmitter();

  private idsSeen: Set<RpMessageId> = new Set();
  public nags: Set<RpMessageId> = new Set();

  ngOnChanges() {
    if (this.showNags) {
      for (const {id} of this.messages) {
        if (this.idsSeen.has(id)) continue;

        this.idsSeen.add(id);
        if (this.idsSeen.size % 40 === 0) {
          this.nags.add(id);
        }
      }
    }
  }

  trackById(index: number, item: RpMessage) {
    return item.id;
  }

  canEdit(msg: RpMessage) {
    return msg.challenge === this.challenge;
  }

  charaFor(msg: RpMessage) {
    return this.charas && (msg.type === 'chara') ? this.charas.find(c => c.id === msg.charaId) : null;
  }

  editMessage(id: string, content: string) {
    this.editMessageContent.emit([id, content]);
  }

  onImageLoaded() {
    this.imageLoaded.emit();
  }

}
