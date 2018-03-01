import { Component, OnInit, ViewChild } from '@angular/core';
import { RpService } from '../rp.service';
import { CharaSelectorService } from './chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  templateUrl: 'chat.html',
  styles: [],
  providers: [CharaSelectorService]
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
  ) { }

  ngOnInit() {
    this.charaSelectorService.setInstance(this.charaMenu);
  }
}
