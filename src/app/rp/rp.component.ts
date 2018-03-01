import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from './rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from './main-menu.service';
import { OptionsService } from './options.service';
import { DOCUMENT } from '@angular/platform-browser';

@Component({
  templateUrl: 'rp.html',
  styles: [],
  providers: [MainMenuService, RpService]
})
export class RpComponent implements OnInit {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  constructor(
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
    this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
    })
  }

}
