import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'rp-message',
  templateUrl: 'rp-message.html',
  styles: []
})
export class RpMessageComponent implements OnInit {

  @Input('msg') msg: {content: string};

  constructor() { }

  ngOnInit() {
  }

}
