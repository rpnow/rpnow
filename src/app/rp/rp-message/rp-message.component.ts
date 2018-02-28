import { Component, OnChanges, SimpleChanges, Input } from '@angular/core';
import * as moment from 'moment-mini';
import { RpMessage } from '../rp.service';
import { OptionsService } from '../options.service';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
  styleUrls: ['rp-message.css']
})
export class RpMessageComponent implements OnChanges {

  constructor(public options: OptionsService) { }

  @Input('msg') msg: RpMessage;

  editing: boolean = false;
  newContent: string = '';

  timeAgo: string = '';
  classes: {[key:string]: boolean} = {};

  ngOnChanges(changes: SimpleChanges) {
    this.timeAgo = this.msg.timestamp ? moment(this.msg.timestamp*1000).fromNow() : '';

    this.classes = {
      'message': true,
      ['message-'+this.msg.type]: true,
      'message-sending': this.msg.sending,
      'message-slim': false
    }
  }

  beginEdit() {
    this.editing = true;
    this.newContent = this.msg.content;
  }

  cancelEdit() {
    this.editing = false;
  }

  confirmEdit() {
    this.editing = false;
    alert('TODO confirm edit');
    // this.msg.edit(this.newContent);
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
