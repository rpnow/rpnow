import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../rp.service';

@Component({
  selector: 'app-rp',
  template: `
    <h1>RP Title: {{ rp.title }}</h1>
    <h2 *ngIf="rp.desc">Description: {{ rp.desc }}</h2>
    <nav>
      <a routerLink="./1">page 1</a>
    </nav>
    <router-outlet></router-outlet>
  `,
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
