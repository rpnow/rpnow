import { Component, OnChanges, SimpleChanges, Input, ChangeDetectionStrategy } from '@angular/core';
import { RpMessage, RpService, RpChara } from '../rp.service';
import { OptionsService } from '../options.service';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
  styleUrls: ['rp-message.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpMessageComponent implements OnChanges {

  constructor(public rp: RpService, public options: OptionsService) { }

  @Input() msg: RpMessage;

  chara: RpChara;

  @Input() sending: boolean = false;
  editing: boolean = false;
  newContent: string = '';

  classes: {[key:string]: boolean} = {};

  ngOnChanges(changes: SimpleChanges) {
    this.classes = {
      'message': true,
      ['message-'+this.msg.type]: true,
      'message-sending': this.sending,
      'message-slim': false
    }

    this.chara = (this.msg.type === 'chara') ? this.rp.charasById.get(this.msg.charaId) : null;
  }

  canEdit() {
    return this.msg.challenge === this.options.challenge.hash;
  }

  beginEdit() {
    this.editing = true;
    this.newContent = this.msg.content;
  }

  cancelEdit() {
    this.editing = false;
  }

  validEdit() {
    return this.newContent.trim() && this.newContent !== this.msg.content;
  }

  async confirmEdit() {
    this.editing = false;
    this.sending = true;
    this.msg.content = this.newContent;
    await this.rp.editMessage(this.msg._id, this.newContent);
    this.sending = false;
  }

  keypressCheckEnter($event: KeyboardEvent) {
    let keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.options.pressEnterToSend || $event.ctrlKey) {
      this.confirmEdit();
      return false;
    }
  }

}
