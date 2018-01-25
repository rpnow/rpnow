import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'title-bar',
  templateUrl: 'title-bar.html',
  styles: []
})
export class TitleBarComponent implements OnInit {

  @Input() title: string;
  @Input() desc: string;
  @Input() rpCode: string;

  constructor() { }

  ngOnInit() {
  }

}
