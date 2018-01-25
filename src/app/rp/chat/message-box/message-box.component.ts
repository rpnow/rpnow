import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CharaSelectorService } from '../chara-selector.service';

@Component({
  selector: 'rp-message-box',
  templateUrl: 'message-box.html',
  styleUrls: ['message-box.scss']
})
export class MessageBoxComponent {

  constructor(private charaSelectorService: CharaSelectorService) { }

  public content: '';
  public type = 'narrator';

  @Output() onMessage: EventEmitter<{content: string, type: string, charaId?: number}> = new EventEmitter();

  sendMessage() {
    this.onMessage.emit({content: this.content, type: this.type});
    this.content = '';
  }

  openCharaSelector() {
    this.charaSelectorService.menu.open();
  }
}
