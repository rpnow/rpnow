import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1>Angular Router</h1>
    <nav>
      <a routerLink="/">Home</a>
      <a routerLink="/rp/dj95iZmY">RP 1</a>
      <a routerLink="/rp/buDmYX4s">RP 2</a>
    </nav>
    <h2>Page below</h2>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent { }
