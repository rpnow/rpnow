import { Component, OnChanges, SimpleChanges, Input, OnInit, OnDestroy } from '@angular/core';
import { RpMessage, RpService, RpChara } from '../rp.service';
import { OptionsService } from '../options.service';
import * as distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import { format } from 'date-fns';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
  styleUrls: ['rp-message.css']
})
export class RpMessageComponent implements OnInit, OnChanges, OnDestroy {

  constructor(public rp: RpService, public options: OptionsService) { }

  @Input() msg: RpMessage;

  chara: RpChara;

  @Input() sending: boolean = false;
  editing: boolean = false;
  newContent: string = '';

  timestampDate: Date;
  editedDate: Date;
  timeAgo: string = '';
  classes: {[key:string]: boolean} = {};

  timerHandle: number;

  ngOnInit() {
    this.timerHandle = setInterval(() => this.updateTimeAgo(), 60*1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerHandle);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.classes = {
      'message': true,
      ['message-'+this.msg.type]: true,
      'message-sending': this.sending,
      'message-slim': false
    }

    this.chara = (this.msg.type === 'chara') ? this.rp.charasById.get(this.msg.charaId) : null;

    this.timestampDate = this.msg.timestamp ? new Date(this.msg.timestamp*1000) : null;
    this.editedDate = this.msg.edited ? new Date(this.msg.edited*1000) : null;

    this.updateTimeAgo()
  }

  updateTimeAgo() {
    this.timeAgo = this.msg.timestamp ? distanceInWordsToNow(this.msg.timestamp*1000) : '';
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
