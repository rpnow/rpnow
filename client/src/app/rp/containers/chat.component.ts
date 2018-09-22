import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { RpService } from '../services/rp.service';
import { Subscription, Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { scan, map, first, combineLatest } from 'rxjs/operators';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { TrackService } from '../../track.service';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpVoice, isSpecialVoice } from '../models/rp-voice';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Title } from '@angular/platform-browser';
import { RpCodeService } from '../services/rp-code.service';
import { RoomService } from '../services/room.service';

@Component({
  selector: 'rpn-chat',
  template: `
    <mat-sidenav-container>

      <mat-sidenav-content>

        <div *ngIf="(rp.loaded|async) == null && (rp.notFound|async) == null" class="center-contents">
          <p>Loading your RP...</p>
          <mat-spinner></mat-spinner>
        </div>

        <div *ngIf="rp.notFound|async" class="center-contents">
          <h1>RP Not Found!</h1>

          <p>We couldn't find an RP at <code>/rp/{{ rp.rpCode }}</code>. Make sure you've spelled the URL correctly.</p>

          <p>If you believe this is an error, contact <a href="mailto:rpnow.net@gmail.com">rpnow.net@gmail.com</a>.</p>
        </div>

        <ng-container *ngIf="rp.loaded|async">
          <rpn-title-bar [rpTitle]="rp.title" [desc]="rp.desc" (clickMenu)="openMenu()"></rpn-title-bar>

          <rpn-scroll-anchor #scrollAnchor [watch]="rp.messages$|async" (atBottomChanged)="atBottom=$event" style="z-index:-1">
            <rpn-welcome *ngIf="isNewRp$|async"></rpn-welcome>

            <p *ngIf="isShowingArchiveLink$|async" id="archive-advice">
              To view older messages, <a routerLink="./1">visit the archive.</a>
            </p>

            <rpn-message-list
              [messages]="messages$|async"
              [charas]="rp.charas$|async"
              [challenge]="(options.challenge$|async).hash"
              [showMessageDetails]="options.showMessageDetails$|async"
              [pressEnterToSend]="options.pressEnterToSend$|async"
              [showNags]="true"
              (editMessageContent)="editMessageContent($event[0], $event[1])"
              (imageLoaded)="scrollAnchor.checkHeight()"
            ></rpn-message-list>
          </rpn-scroll-anchor>

          <rpn-send-box
            [(content)]="options.msgBoxContent"
            [voice]="currentChara$|async"
            [pressEnterToSend]="options.pressEnterToSend$|async"
            (sendMessage)="sendMessage($event[0],$event[1])"
            (sendImage)="sendImage($event)"
            (changeChara)="toggleCharaSelector()"
          ></rpn-send-box>
        </ng-container>

      </mat-sidenav-content>

      <mat-sidenav position="end" [mode]="charaDrawerMode$|async" [(opened)]="charaSelectorOpen">

        <rpn-chara-drawer-contents
          [charas]="rp.charas$|async"
          [recentCharas]="recentCharas$|async"
          [currentChara]="currentChara$|async"
          [isInline]="(isSmall$|async) === false"
          (closeDrawer)="closeCharaSelector()"
          (setVoice)="setVoice($event)"
          (newChara)="createNewChara($event)"
        ></rpn-chara-drawer-contents>

      </mat-sidenav>

    </mat-sidenav-container>

    <rpn-notify [lastMessage]="rp.newMessages$|async" [charasById]="rp.charasById$|async"></rpn-notify>
  `,
  styles: [`
    :host, mat-sidenav-container, mat-sidenav-content {
      flex: 1;
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
    #archive-advice {
      font-style: italic;
      margin: 3vh auto 0;
      padding: 10px;
      width: 96vw;
      max-width: 400px;
      text-align: center;
    }
    #archive-advice a {
      text-decoration: none;
      border-bottom: 1px dotted rgb(124, 77, 255);
      color: rgb(124, 77, 255);
      opacity: 0.87;
    }
    :host-context(.dark-theme) #archive-advice a {
      color: rgb(255,193,7);
      border-bottom-color: rgb(255,193,7);
    }
  `],
  providers: [
    RpService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {

  private readonly DEFAULT_MESSAGE_CUTOFF = 60;
  private readonly MAX_MESSAGE_CUTOFF = 300;

  private readonly SMALL_BREAKPOINT = '(max-width: 1023px)';

  private subscription: Subscription;

  public atBottom: boolean;

  public messages$: Observable<RpMessage[]>;
  public currentChara$: Observable<RpVoice>;
  public recentCharas$: Observable<RpChara[]>;
  public isNewRp$: Observable<boolean>;
  public isShowingArchiveLink$: Observable<boolean>;

  isSmall$: Observable<boolean>;
  charaDrawerMode$: Observable<'over'|'side'>;

  charaSelectorOpen = false;

  constructor(
    public rp: RpService,
    private rpCodeService: RpCodeService,
    private title: Title,
    private roomService: RoomService,
    public options: OptionsService,
    private mainMenuService: MainMenuService,
    private snackbar: MatSnackBar,
    private track: TrackService,
    private breakpointObserver: BreakpointObserver
  ) { }

  ngOnInit() {
    this.title.setTitle('Loading... | RPNow');
    this.rp.loaded.then(found => {
      if (found) this.title.setTitle(this.rp.title + ' | RPNow');
      else this.title.setTitle('Not Found | RPNow');
    });

    this.currentChara$ = this.options.msgBoxVoice$.pipe(
      combineLatest(this.rp.charasById$, (msgBoxVoice, charasById) => {
        return isSpecialVoice(msgBoxVoice) ?
          msgBoxVoice :
          charasById.get(msgBoxVoice);
      })
    );

    this.messages$ = this.rp.messages$.pipe(
      scan(({firstIdx}: {firstIdx: number, msgs: RpMessage[]}, msgs: RpMessage[]) => {
        if (this.atBottom) return { msgs, firstIdx: Math.max(msgs.length - this.DEFAULT_MESSAGE_CUTOFF, 0) };
        else return { msgs, firstIdx: Math.max(msgs.length - this.MAX_MESSAGE_CUTOFF, 0, firstIdx) };
      }, {firstIdx: 0, msgs: <RpMessage[]>null}),
      map(({msgs, firstIdx}) => msgs.slice(firstIdx))
    );

    this.isNewRp$ = this.messages$.pipe(
      first(),
      map(msgs => msgs.length === 0)
    );

    this.isShowingArchiveLink$ = this.messages$.pipe(
      map(msgs => msgs.length >= this.DEFAULT_MESSAGE_CUTOFF)
    );

    this.subscription = this.rp.newMessages$.subscribe(() => {
      if (!this.atBottom) {
        this.snackbar.open('New messages below!', 'Close', {
          duration: 2000,
          verticalPosition: 'top'
        });
      }
    });

    this.recentCharas$ = this.options.recentCharas$.pipe(
      combineLatest(this.rp.charasById$, (recentCharas, charasById) => {
        return recentCharas.map(id => charasById.get(id));
      }),
    );

    this.isSmall$ = this.breakpointObserver.observe(this.SMALL_BREAKPOINT).pipe(
      map(state => state.matches)
    );

    this.charaDrawerMode$ = this.isSmall$.pipe(
      map(isSmall => isSmall ? 'over' : 'side')
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  openMenu() {
    this.mainMenuService.menu.open();
  }

  toggleCharaSelector() {
    this.charaSelectorOpen = !this.charaSelectorOpen;
  }

  closeCharaSelector() {
    this.charaSelectorOpen = false;
  }

  closeCharaSelectorIfOverlay() {
    if (this.breakpointObserver.isMatched(this.SMALL_BREAKPOINT)) {
      this.charaSelectorOpen = false;
    }
  }

  async createNewChara($event: {name: string, color: string}) {
    this.closeCharaSelectorIfOverlay();
    const charaId = (
      await this.roomService.addChara(this.rpCodeService.rpCode, $event.name, $event.color)
    )._id;
    this.options.msgBoxVoice = charaId;
    this.updateRecentCharas(charaId);
  }

  setVoice(voice: RpVoice) {
    this.track.event('Charas', 'pick', typeof voice === 'string' ? voice : 'chara');

    this.options.msgBoxVoice = isSpecialVoice(voice) ? voice : voice._id;
    if (!isSpecialVoice(voice)) this.updateRecentCharas(voice._id);
    this.closeCharaSelectorIfOverlay();
  }

  private updateRecentCharas(charaId: RpCharaId) {
    this.options.recentCharas = [
      charaId, ...this.options.recentCharas.filter(id => id !== charaId)
    ].slice(0, 5);
  }

  async sendMessage(content: string, voice: RpChara) {
    await this.roomService.addMessage(this.rpCodeService.rpCode, content, voice);

    // erase saved message box content upon successful message delivery
    if (content === this.options.msgBoxContent) {
      this.options.msgBoxContent = '';
    }
  }

  editMessageContent(id: RpMessageId, content: string) {
    this.roomService.editMessage(this.rpCodeService.rpCode, id, content);
  }

  sendImage(url: string) {
    this.roomService.addImage(this.rpCodeService.rpCode, url);
  }

}
