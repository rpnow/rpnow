import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  template: `
    <div id="not-found">
      <h1>Page not found: <code>{{ route }}</code></h1>

      <p>Sorry, there's no page at this address. Make sure you've spelled the URL correctly, or <a routerLink="/">return to the RPNow homepage.</a></p>

      <p>If you believe this is an error, contact <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>.</p>
    </div>
  `,
  styles: [`
    #not-found {
      display: flex;
      flex-direction: column;
      height: 100%;
      align-items: center center;
      justify-content: center;
      margin: auto;
      max-width: 400px;
      padding: 10px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {

  route = location.pathname;

  constructor(private titleService: Title) { }

  ngOnInit() {
    this.titleService.setTitle('Page Not Found | RPNow');
  }

}
