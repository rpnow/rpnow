import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OptionsService } from '../services/options.service';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { RpVoice, isSpecialVoice, typeFromVoice } from '../models/rp-voice';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Title } from '@angular/platform-browser';
import { ChallengeService } from '../services/challenge.service';
import { Router } from '@angular/router';
import { RpCodeService } from '../services/rp-code.service';

@Component({
  selector: 'rpn-demo-chat',
  template: `
    <mat-sidenav-container>

      <mat-sidenav-content>

        <rpn-title-bar title="Demo RP" desc="Welcome to the demo!" [menuIcon]="'arrow_back'" (clickMenu)="navigateToHome()"></rpn-title-bar>

        <rpn-scroll-anchor #scrollAnchor [watch]="messages" style="z-index:-1">
          <rpn-message-list
            [messages]="messages"
            [charas]="charas"
            [challenge]="challengeService.challenge.hash"
            [showMessageDetails]="true"
            [pressEnterToSend]="true"
            [showNags]="true"
            (editMessageContent)="editMessageContent($event[0], $event[1])"
            (imageLoaded)="scrollAnchor.checkHeight()"
          ></rpn-message-list>
        </rpn-scroll-anchor>

        <rpn-send-box
          [(content)]="msgBoxContent"
          [voice]="currentVoice"
          [pressEnterToSend]="true"
          (sendMessage)="sendMessage($event[0],$event[1])"
          (sendImage)="sendImage($event)"
          (changeChara)="toggleCharaSelector()"
        ></rpn-send-box>

      </mat-sidenav-content>

      <mat-sidenav position="end" [mode]="charaDrawerMode$|async" [(opened)]="charaSelectorOpen">

        <rpn-chara-drawer-contents
          [charas]="charas"
          [recentCharas]="recentCharas"
          [currentChara]="currentVoice"
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
      height: 100%;
    }
  `],
  providers: [
    RpCodeService,
    OptionsService,
    ChallengeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemoChatComponent implements OnInit {

  private readonly SMALL_BREAKPOINT = '(max-width: 1023px)';

  public messages: RpMessage[] = [
    {
      _id: 'm 1',
      timestamp: Date.now() / 1000,
      type: 'narrator',
      content: 'Welcome to the RPNow demo!',
    },
    {
      _id: 'm 2',
      timestamp: Date.now() / 1000,
      type: 'narrator',
      content: 'TODO What does the demo need?',
    },
  ];
  public charas: RpChara[] = [
    {
      _id: 'c 1',
      name: 'Jerome',
      color: '#e84858',
    }
  ];
  public currentVoice: RpVoice = 'narrator';
  public recentCharas: RpChara[] = [];
  public msgBoxContent = '';

  isSmall$: Observable<boolean>;
  charaDrawerMode$: Observable<'over'|'side'>;

  charaSelectorOpen = false;

  constructor(
    private router: Router,
    private title: Title,
    private breakpointObserver: BreakpointObserver,
    public challengeService: ChallengeService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.title.setTitle('Demo | RPNow');

    this.isSmall$ = this.breakpointObserver.observe(this.SMALL_BREAKPOINT).pipe(
      map(state => state.matches)
    );

    this.charaDrawerMode$ = this.isSmall$.pipe(
      map(isSmall => isSmall ? 'over' : 'side')
    );

    setTimeout(() => {
      if (!this.breakpointObserver.isMatched(this.SMALL_BREAKPOINT)) {
        this.charaSelectorOpen = true;
      }
      this.changeDetectorRef.detectChanges();
    }, 800);
  }

  navigateToHome() {
    this.router.navigateByUrl('/');
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

  createNewChara($event: {name: string, color: string}) {
    this.closeCharaSelectorIfOverlay();
    const chara: RpChara = {
      _id: Math.random() + '',
      ...$event,
      timestamp: Date.now() / 1000
    };
    this.charas = [...this.charas, chara];
    this.currentVoice = chara;
    this.updateRecentCharas(chara);
  }

  setVoice(voice: RpVoice) {
    this.currentVoice = voice;
    if (!isSpecialVoice(voice)) this.updateRecentCharas(voice);
    this.closeCharaSelectorIfOverlay();
  }

  private updateRecentCharas(chara: RpChara) {
    this.recentCharas = [
      chara, ...this.recentCharas.filter(({_id}) => _id !== chara._id)
    ].slice(0, 5);
  }

  sendMessage(content: string, voice: RpChara) {
    const msg = {
      _id: Math.random() + '',
      content,
      ...typeFromVoice(voice),
      challenge: this.challengeService.challenge.hash,
      timestamp: Date.now() / 1000
    };

    this.messages = [...this.messages, msg];

    // erase saved message box content upon successful message delivery
    if (content === this.msgBoxContent) {
      this.msgBoxContent = '';
    }
  }

  editMessageContent(id: RpMessageId, content: string) {
    const idx = this.messages.findIndex(m => m._id === id);
    const msg: RpMessage = {
      ...this.messages[idx],
      content,
      edited: Date.now() / 1000
    };
    this.messages = [...this.messages];
    this.messages[idx] = msg;
  }

  sendImage(url: string) {
    const msg: RpMessage = {
      _id: Math.random() + '',
      type: 'image',
      url,
      challenge: this.challengeService.challenge.hash,
      timestamp: Date.now() / 1000
    };
    this.messages = [...this.messages, msg];
  }

}
