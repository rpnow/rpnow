import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-title',
  template: `
    <p>
      title works!
    </p>
  `,
  styles: []
})
export class TitleComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
