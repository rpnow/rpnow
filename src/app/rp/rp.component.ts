import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from './rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from './main-menu.service';
import { OptionsService } from './options.service';
import { DOCUMENT } from '@angular/platform-browser';
import { NotifyService } from './notify.service';
import { ChallengeService } from './challenge.service';

@Component({
  templateUrl: 'rp.html',
  styles: [],
  providers: [
    MainMenuService,
    RpService,
    NotifyService,
    OptionsService,
    ChallengeService
  ]
})
export class RpComponent implements OnInit {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  constructor(
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    notifyService: NotifyService
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);
    this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
    })
  }

}
