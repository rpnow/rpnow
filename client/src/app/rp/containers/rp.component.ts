import { Component, OnInit, ViewChild, Inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { DOCUMENT } from '@angular/common';
import { Subscription, Observable, combineLatest } from 'rxjs';
import { BannerMessageService } from '../services/banner-message.service';
import { tap } from 'rxjs/operators';
import { RpCodeService } from '../services/rp-code.service';
import { RoomService } from '../services/room.service';
import { ChallengeService } from '../services/challenge.service';

@Component({
  selector: 'rpn-room',
  template: `
    <mat-sidenav-container>

      <mat-sidenav #mainMenu position="start" mode="over">

        <rpn-main-menu-content (closeMenu)="mainMenu.close()"></rpn-main-menu-content>

      </mat-sidenav>

      <mat-sidenav-content>

          <rpn-banner-message [message]="bannerMessage$|async" (dismiss)="dismissBanner($event)"></rpn-banner-message>

          <router-outlet></router-outlet>

      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  styles: [`
    mat-sidenav-container {
      height: 100%;
    }
    mat-sidenav-content {
      display: flex;
      flex-direction: column;
    }
  `],
  providers: [
    BannerMessageService,
    ChallengeService,
    MainMenuService,
    OptionsService,
    RoomService,
    RpCodeService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpComponent implements OnInit, OnDestroy {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  public subscription: Subscription;

  bannerMessage$: Observable<string>;

  constructor(
    public rpCodeService: RpCodeService,
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    private bannerService: BannerMessageService,
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);

    this.subscription = this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
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
