import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../../rp.service';

@Component({
  templateUrl: 'chat.html',
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
