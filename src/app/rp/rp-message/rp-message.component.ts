import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { RpMessage, RpService, RpChara, RpVoice } from '../rp.service';
import { OptionsService } from '../options.service';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
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

  @Input() canEdit: boolean = false;
  @Input() pressEnterToSend: boolean = false;
  @Input() showMessageDetails: boolean = false;

  @Output() editContent: EventEmitter<string> = new EventEmitter();

  editing: boolean = false;
  newContent: string = '';
  sending: boolean = false;

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
      ['message-'+this.type]: true,
      'message-sending': this.sending,
      'message-slim': false
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

  keypressCheckEnter($event: KeyboardEvent) {
    let keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.pressEnterToSend || $event.ctrlKey) {
      this.confirmEdit();
      return false;
    }
  }

}
