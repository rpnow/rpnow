import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { Rp } from '../rp.service';

@Component({
  selector: 'app-rp',
  template: `
    <h1>RP Title: {{ rp.title$ | async }}</h1>
    <h2>Description: {{ rp.desc$ | async }}</h2>
    <pre>{{ rp.charas$ | async | json }}</pre>
    <hr />
    <pre>{{ rp.messages$ | async | json }}</pre>
  `,
  styles: []
})
export class RpComponent implements OnInit {

  public rp: Rp;

  constructor(
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    console.log('on init');
    this.route.data.pluck('rp').subscribe((rp:Rp) => this.rp = rp);
    this.route
  }

  onRouteDeactivate() {
    this.rp.close();
  }

}
