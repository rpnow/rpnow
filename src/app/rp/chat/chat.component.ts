import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../../rp.service';

@Component({
  templateUrl: 'chat.html',
  styles: []
})
export class ChatComponent implements OnInit {

  public rp: Rp;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

  public sendMessage(message: any) {
    this.rp.addMessage(message);
  }

}
