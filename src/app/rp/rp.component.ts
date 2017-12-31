import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Rp } from '../rp.service';

@Component({
  selector: 'app-rp',
  template: `
    <h1>RP Title: {{ rp.title }}</h1>
    <h2 *ngIf="rp.desc">Description: {{ rp.desc }}</h2>
    <textarea [(ngModel)]="content"></textarea>
    <button (click)="sendMessage()">Send</button>
    <pre>{{ rp.charas | json }}</pre>
    <hr />
    <pre>{{ rp.messages | json }}</pre>
  `,
  styles: []
})
export class RpComponent implements OnInit {

  public rp: Rp;

  public content: '';

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

  onRouteDeactivate() {
    this.rp.close();
  }

  public sendMessage() {
    this.rp.addMessage({type:'narrator', content: this.content})
  }

}
