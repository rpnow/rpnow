import { Component, OnInit, ViewChild, Inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { DOCUMENT } from '@angular/common';
import { Subscription, Observable } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { RpCodeService } from '../services/rp-code.service';
import { RoomService } from '../services/room.service';
import { ChallengeService } from '../services/challenge.service';
import { ClientUpdateService } from '../services/client-update.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'rpn-room',
  template: `
    <mat-sidenav-container>

      <mat-sidenav #mainMenu position="start" mode="over">

        <rpn-main-menu-content (closeMenu)="mainMenu.close()"></rpn-main-menu-content>

      </mat-sidenav>

      <mat-sidenav-content>

          <rpn-banner-message
            [showTos]="(options.agreeToTerms$|async) === false"
            [hasUpdate]="false"
            (acceptTerms)="acceptTerms()"
          ></rpn-banner-message>

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
    ChallengeService,
    // ClientUpdateService,
    MainMenuService,
    OptionsService,
    RoomService,
    RpCodeService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RpComponent implements OnInit, OnDestroy {
  @ViewChild('mainMenu') mainMenu: MatSidenav;

  private subscription: Subscription;
  public updates$: Observable<boolean>;

  constructor(
    public rpCodeService: RpCodeService,
    private mainMenuService: MainMenuService,
    public options: OptionsService,
    @Inject(DOCUMENT) private document: Document,
    // private clientUpdateService: ClientUpdateService, // does stuff in the constructor
    // private clientUpdates: SwUpdate,
  ) { }

  ngOnInit() {
    this.mainMenuService.setInstance(this.mainMenu);

    this.subscription = this.options.nightMode$.subscribe(nightMode => {
      this.document.body.className = nightMode ? 'dark-theme' : '';
    });

    // this.updates$ = this.clientUpdates.available.pipe(
    //   mapTo(true),
    // );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.document.body.className = '';
  }

  acceptTerms() {
    this.options.agreeToTerms = true;
  }

  // activateUpdate() {
  //   this.clientUpdates.activateUpdate().then(() => document.location.reload());
  // }

}
