import { Component, OnInit, ViewChild, Inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from '../services/rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NotifyService } from '../services/notify.service';
import { ChallengeService } from '../services/challenge.service';
import { Subscription } from 'rxjs/Subscription';
import { BannerMessageService } from '../services/banner-message.service';
import { Observable } from 'rxjs/Observable';
import { tap } from 'rxjs/operators/tap';
import { combineLatest } from 'rxjs/observable/combineLatest';

@Component({
  template: `
    <mat-sidenav-container fxFill>

        <mat-sidenav #mainMenu position="start" mode="over">

            <rpn-main-menu-content [rpTitle]="rp.title" (closeMenu)="mainMenu.close()"></rpn-main-menu-content>

        </mat-sidenav>

        <mat-sidenav-content fxLayout="column">

            <div *ngIf="(rp.loaded|async) == null && (rp.notFound|async) == null" fxFlex fxLayout="column" fxLayoutAlign="center center">
                <p>Loading your RP...</p>
                <mat-spinner></mat-spinner>
            </div>

            <ng-container *ngIf="rp.loaded|async">
                <rpn-banner-message [message]="bannerMessage$|async" (dismiss)="dismissBanner($event)"></rpn-banner-message>
                <div fxFlex>
                    <router-outlet></router-outlet>
                </div>
            </ng-container>

            <div *ngIf="rp.notFound|async" fxFlex fxLayout="column" fxLayoutAlign="center center">
                <h1>RP Not Found!</h1>

                <p>We couldn't find an RP at <code>/rp/{{ rp.rpCode }}</code>. Make sure you've spelled the URL correctly.</p>

                <p>If you believe this is an error, contact <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>.</p>
            </div>

        </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  providers: [
    BannerMessageService,
    ChallengeService,
    MainMenuService,
    NotifyService,
    OptionsService,
    RpService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpComponent implements OnInit, OnDestroy {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  public subscription: Subscription;
  public subscription2: Subscription;

  bannerMessage$: Observable<string>;

  constructor(
    public rp: RpService,
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    private title: Title,
    private bannerService: BannerMessageService,
    notifyService: NotifyService // included so that it automatically starts working
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);

    this.subscription = this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
    });

    this.title.setTitle('Loading... | RPNow');
    this.rp.loaded.then(found => {
      if (found) this.title.setTitle(this.rp.title + ' | RPNow');
      else this.title.setTitle('Not Found | RPNow');
    });

    this.bannerMessage$ = combineLatest(
      this.bannerService.message$.pipe(
        tap(msg => {
          if (!msg) this.options.lastBannerSeen = null;
        })
      ),
      this.options.lastBannerSeen$,
      (msg, lastMsg) => {
        if (!msg) return null;
        if (msg === lastMsg) return null;
        return msg;
      }
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.document.body.className = '';
  }

  dismissBanner(message: string) {
    this.options.lastBannerSeen = message;
  }

}
