import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="loading" id="loading">
      <p>Loading RPNow layout...</p>
      <mat-spinner></mat-spinner>
    </div>
    <router-outlet *ngIf="!loading"></router-outlet>
  `,
  styles: [`
    #loading {
      display: flex;
      flex-direction: column;
      height: 100%;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}
  loading = false;

  ngOnInit() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationStart)
    ).subscribe(() => this.loading = true)
    this.router.events.pipe(
      filter(e => (e instanceof NavigationEnd) || (e instanceof NavigationCancel))
    ).subscribe(() => this.loading = false)
  }
}
