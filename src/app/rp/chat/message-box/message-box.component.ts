import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'rp-message-box',
  template: `
    <textarea [(ngModel)]="content"></textarea>
    <button (click)="sendMessage()">Send</button>
  `,
  styles: []
})
export class MessageBoxComponent {

  public content: '';

  @Output() onMessage: EventEmitter<{content: string, type: string, charaId?: number}> = new EventEmitter();

  sendMessage() {
    this.onMessage.emit({content: this.content, type: 'narrator'});
    this.content = '';
  }
}
