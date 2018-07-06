import { Component, OnInit, ViewChild, Inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService } from '../services/rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ChallengeService } from '../services/challenge.service';
import { Subscription, Observable, combineLatest } from 'rxjs';
import { BannerMessageService } from '../services/banner-message.service';
import { tap } from 'rxjs/operators';
import { RpCodeService } from '../services/rp-code.service';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'rpn-room',
  template: `
    <mat-sidenav-container>

      <mat-sidenav #mainMenu position="start" mode="over">

        <rpn-main-menu-content [rpTitle]="rp.title" (closeMenu)="mainMenu.close()"></rpn-main-menu-content>

      </mat-sidenav>

      <mat-sidenav-content>

        <div *ngIf="(rp.loaded|async) == null && (rp.notFound|async) == null" class="center-contents">
          <p>Loading your RP...</p>
          <mat-spinner></mat-spinner>
        </div>

        <ng-container *ngIf="rp.loaded|async">
          <rpn-banner-message [message]="bannerMessage$|async" (dismiss)="dismissBanner($event)"></rpn-banner-message>
          <router-outlet></router-outlet>
        </ng-container>

        <div *ngIf="rp.notFound|async" class="center-contents">
          <h1>RP Not Found!</h1>

          <p>We couldn't find an RP at <code>/rp/{{ rp.rpCode }}</code>. Make sure you've spelled the URL correctly.</p>

          <p>If you believe this is an error, contact <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>.</p>
        </div>

      </mat-sidenav-content>

    </mat-sidenav-container>

    <rpn-notify [lastMessage]="rp.newMessages$|async" [charasById]="rp.charasById$|async"></rpn-notify>
  `,
  styles: [`
    mat-sidenav-container {
      height: 100%;
    }
    mat-sidenav-content {
      display: flex;
      flex-direction: column;
    }
    .center-contents {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 20px;
    }
  `],
  providers: [
    BannerMessageService,
    ChallengeService,
    MainMenuService,
    OptionsService,
    RoomService,
    RpService,
    RpCodeService
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
