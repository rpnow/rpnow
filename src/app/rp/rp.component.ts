import { Component, OnInit, ViewChild, Inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from './rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from './main-menu.service';
import { OptionsService } from './options.service';
import { DOCUMENT, Title } from '@angular/platform-browser';
import { NotifyService } from './notify.service';
import { ChallengeService } from './challenge.service';
import { Subscription } from 'rxjs/Subscription';

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
export class RpComponent implements OnInit, OnDestroy {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  public subscription: Subscription;

  constructor(
    public rp: RpService,
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    private title: Title,
    notifyService: NotifyService
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);

    this.subscription = this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
    })

    this.title.setTitle('Loading... | RPNow');
    this.rp.loaded.then(() => this.title.setTitle(this.rp.title + ' | RPNow'));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.document.body.className = '';
  }

}
