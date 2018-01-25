import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../rp.service';

@Component({
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class RpComponent implements OnInit {

  public rp: Rp;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

  onRouteDeactivate() {
    this.rp.close();
  }

}
