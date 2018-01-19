import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'rp-message-box',
  templateUrl: 'message-box.html',
  styleUrls: ['message-box.scss']
})
export class MessageBoxComponent {

  public content: '';
  public type = 'narrator';

  @Output() onMessage: EventEmitter<{content: string, type: string, charaId?: number}> = new EventEmitter();

  sendMessage() {
    this.onMessage.emit({content: this.content, type: this.type});
    this.content = '';
  }
}
