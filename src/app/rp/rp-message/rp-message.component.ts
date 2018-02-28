import { Component, OnChanges, SimpleChanges, Input } from '@angular/core';
import * as moment from 'moment-mini';
import { RpMessage, RpService } from '../rp.service';
import { OptionsService } from '../options.service';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
  styleUrls: ['rp-message.css']
})
export class RpMessageComponent implements OnChanges {

  constructor(public rp: RpService, public options: OptionsService) { }

  @Input() msg: RpMessage;

  sending: boolean = false;
  editing: boolean = false;
  newContent: string = '';

  timeAgo: string = '';
  classes: {[key:string]: boolean} = {};

  ngOnChanges(changes: SimpleChanges) {
    this.timeAgo = this.msg.timestamp ? moment(this.msg.timestamp*1000).fromNow() : '';

    this.classes = {
      'message': true,
      ['message-'+this.msg.type]: true,
      'message-sending': this.sending,
      'message-slim': false
    }
  }

  public canEdit() {
    return this.msg.challenge === this.options.challenge.hash;
  }

  beginEdit() {
    this.editing = true;
    this.newContent = this.msg.content;
  }

  cancelEdit() {
    this.editing = false;
  }

  async confirmEdit() {
    this.editing = false;
    this.sending = true;
    this.msg.content = this.newContent;
    await this.rp.editMessage(this.msg.id, this.newContent);
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
