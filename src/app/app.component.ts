import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { OptionsService } from './rp/options.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent implements OnInit {
  constructor(
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit() {
    this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : 'light-theme';
    })
  }
}
