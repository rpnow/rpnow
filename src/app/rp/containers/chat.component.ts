import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { RpService } from '../services/rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription, Observable, BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { scan, map, filter, tap, first } from 'rxjs/operators';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { TrackService } from '../../track.service';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara, RpCharaId } from '../models/rp-chara';
import { RpVoice, isSpecialVoice } from '../models/rp-voice';
import { BreakpointObserver } from '@angular/cdk/layout';

@Component({
  selector: 'rpn-chat',
  template: `
    <mat-sidenav-container>

      <mat-sidenav-content>

        <rpn-title-bar [title]="rp.title" [desc]="rp.desc" (clickMenu)="openMenu()"></rpn-title-bar>

        <div class="flex-scroll-container" style="z-index:-1" #messageContainer (scroll)="onScroll()">

          <rpn-welcome *ngIf="isNewRp$|async"></rpn-welcome>

          <rpn-message-list
            [messages]="messages$|async"
            [charas]="rp.charas$|async"
            [challenge]="(options.challenge$|async).hash"
            [showMessageDetails]="options.showMessageDetails$|async"
            [pressEnterToSend]="options.pressEnterToSend$|async"
            [showNags]="true"
            (editMessageContent)="editMessageContent($event[0], $event[1])"
            (imageLoaded)="updateScroll()"
          ></rpn-message-list>

        </div>

        <rpn-send-box
          [(content)]="options.msgBoxContent"
          [voice]="currentChara$|async"
          [pressEnterToSend]="options.pressEnterToSend$|async"
          (sendMessage)="sendMessage($event[0],$event[1])"
          (sendImage)="sendImage($event)"
          (changeChara)="toggleCharaSelector()"
        ></rpn-send-box>

      </mat-sidenav-content>

      <mat-sidenav position="end" [mode]="charaDrawerMode$|async" [(opened)]="charaSelectorOpen">

        <rpn-chara-drawer-contents
          [charas]="sortedCharas$|async"
          [recentCharas]="recentCharas$|async"
          [currentChara]="currentChara$|async"
          [isInline]="(isSmall$|async) === false"
          (closeDrawer)="closeCharaSelector()"
          (setVoice)="setVoice($event)"
          (newChara)="createNewChara($event)"
        ></rpn-chara-drawer-contents>

      </mat-sidenav>

    </mat-sidenav-container>
  `,
  styles: [`
    :host, mat-sidenav-container, mat-sidenav-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {

  private readonly SMALL_BREAKPOINT = '(max-width: 1023px)';

  @ViewChild('messageContainer') messageContainer: ElementRef;
  private el: HTMLDivElement;

  private subscription: Subscription;
  private subscription2: Subscription;

  private atBottom = true;

  public messages$: Observable<RpMessage[]>;
  public currentChara$: BehaviorSubject<RpVoice>;
  public sortedCharas$: Observable<RpChara[]>;
  public recentCharas$: Observable<RpChara[]>;
  public isNewRp$: Observable<boolean>;

  isSmall$: Observable<boolean>;
  charaDrawerMode$: Observable<'over'|'side'>;

  charaSelectorOpen = false;

  constructor(
    public rp: RpService,
    public options: OptionsService,
    private mainMenuService: MainMenuService,
    private snackbar: MatSnackBar,
    private track: TrackService,
    private breakpointObserver: BreakpointObserver
  ) { }

  ngOnInit() {
    this.el = this.messageContainer.nativeElement as HTMLDivElement;

    const initialVoice = isSpecialVoice(this.options.msgBoxVoice) ?
      this.options.msgBoxVoice as RpVoice :
      this.rp.charasById.get(this.options.msgBoxVoice as RpCharaId);

    this.currentChara$ = new BehaviorSubject(initialVoice);

    this.subscription2 = this.currentChara$.subscribe(voice => this.options.msgBoxVoice$.next(typeof voice === 'string' ? voice : voice.id));

    this.messages$ = this.rp.messages$.pipe(
      scan(({firstIdx}: {firstIdx: number, msgs: RpMessage[]}, msgs: RpMessage[]) => {
        if (this.atBottom) return { msgs, firstIdx: Math.max(msgs.length - 60, 0) };
        else return { msgs, firstIdx: Math.max(msgs.length - 300, 0, firstIdx) };
      }, {firstIdx: 0, msgs: <RpMessage[]>null}),
      map(({msgs, firstIdx}) => msgs.slice(firstIdx))
    );

    this.isNewRp$ = this.messages$.pipe(
      first(),
      map(msgs => msgs.length === 0)
    );

    this.subscription = this.rp.newMessages$.subscribe(() => this.updateScroll());
    this.updateScroll();

    this.sortedCharas$ = this.rp.charas$.pipe(
      map(charas => [...charas].sort((a, b) => a.name.localeCompare(b.name)))
    );

    this.recentCharas$ = this.currentChara$.pipe(
      filter(chara => typeof chara !== 'string'),
      scan((arr: RpChara[], chara: RpChara) => [
        chara, ...arr.filter(c => c.id !== chara.id)
      ].slice(0, 5), this.options.recentCharas.map(id => this.rp.charasById.get(id))),
      tap((charas: RpChara[]) => this.options.recentCharas = charas.map(c => c.id)), // TODO should probably subscribe here, not use 'do' operator
      map((charas: RpChara[]) => [...charas].sort((a, b) => a.name.localeCompare(b.name)))
    );

    this.isSmall$ = this.breakpointObserver.observe(this.SMALL_BREAKPOINT).pipe(
      map(state => state.matches)
    );

    this.charaDrawerMode$ = this.isSmall$.pipe(
      map(isSmall => isSmall ? 'over' : 'side')
    );
  }

  onScroll() {
    // 31 is because the padding on the rp message list is 20+10.
    // So, this comparison needs to be greater than 30 for the initial page load
    // Not sure why exactly.
    this.atBottom = (this.el.scrollHeight - this.el.scrollTop - this.el.offsetHeight < 31);
  }

  updateScroll() {
    if (this.atBottom) {
      setTimeout(() => this.el.scrollTop = this.el.scrollHeight, 1);
    } else {
      this.snackbar.open('New messages below!', 'Close', {
        duration: 2000,
        verticalPosition: 'top'
      });
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.subscription2.unsubscribe();
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
    const chara = await this.rp.addChara($event.name, $event.color);
    this.currentChara$.next(chara);
  }

  setVoice(voice: RpVoice) {
    this.track.event('Charas', 'pick', typeof voice === 'string' ? voice : 'chara');

    this.currentChara$.next(voice);
    this.closeCharaSelectorIfOverlay();
  }

  async sendMessage(content: string, voice: RpChara) {
    await this.rp.addMessage(content, voice);

    // erase saved message box content upon successful message delivery
    if (content === this.options.msgBoxContent) {
      this.options.msgBoxContent = '';
    }
  }

  editMessageContent(id: RpMessageId, content: string) {
    this.rp.editMessage(id, content);
  }

  sendImage(url: string) {
    this.rp.addImage(url);
  }

}
