import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../../rp.service';

@Component({
  selector: 'app-chat',
  template: `
    <textarea [(ngModel)]="content"></textarea>
    <button (click)="sendMessage()">Send</button>
    <pre>{{ rp.charas | json }}</pre>
    <hr />
    <pre>{{ rp.messages | json }}</pre>
  `,
  styles: []
})
export class ChatComponent implements OnInit {

  public rp: Rp;

  public content: '';

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.parent.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

  public sendMessage() {
    this.rp.addMessage({type:'narrator', content: this.content})
  }

}
