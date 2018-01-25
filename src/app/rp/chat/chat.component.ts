import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../../rp.service';
import { CharaSelectorService } from './chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  templateUrl: 'chat.html',
  styles: [],
  providers: [CharaSelectorService]
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;

  public rp: Rp;

  constructor(
    private route: ActivatedRoute,
    private charaSelectorService: CharaSelectorService
  ) { }

  ngOnInit() {
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
    this.charaSelectorService.setInstance(this.charaMenu);
  }

  public sendMessage(message: any) {
    this.rp.addMessage(message);
  }

}
