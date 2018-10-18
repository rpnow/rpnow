import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { OptionsService } from '../services/options.service';
import { RpMessage, RpMessageId } from '../models/rp-message';
import { RpChara } from '../models/rp-chara';
import { RpVoice, isSpecialVoice, typeFromVoice } from '../models/rp-voice';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Title, Meta } from '@angular/platform-browser';
import { ChallengeService } from '../services/challenge.service';
import { Router } from '@angular/router';
import { RpCodeService } from '../services/rp-code.service';
import { DemoRoomService } from '../services/demo-room.service';

@Component({
  selector: 'rpn-demo-chat',
  template: `
    <mat-sidenav-container>

      <mat-sidenav-content>

        <rpn-title-bar rpTitle="Test RP" [menuIcon]="'arrow_back'" (clickMenu)="navigateToHome()"></rpn-title-bar>

        <rpn-scroll-anchor #scrollAnchor [watch]="demoRoom.messages$|async" style="z-index:-1">
          <rpn-message-list
            [messages]="demoRoom.messages$|async"
            [charas]="demoRoom.charas$|async"
            [challenge]="(challengeService.challenge$|async)?.hash"
            [showMessageDetails]="true"
            [pressEnterToSend]="true"
            [showNags]="true"
            (editMessageContent)="editMessageContent($event[0], $event[1])"
            (deleteMessage)="onDeleteMessage($event)"
            (undeleteMessage)="onUndeleteMessage($event)"
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
          [charas]="demoRoom.charas$|async"
          [recentCharas]="recentCharas"
          [currentChara]="currentVoice"
          [isInline]="(isSmall$|async) === false"
          [challenge]="(challengeService.challenge$|async)?.hash"
          (closeDrawer)="closeCharaSelector()"
          (setVoice)="setVoice($event)"
          (newChara)="createNewChara($event)"
          (editChara)="editChara($event)"
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
    DemoRoomService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemoChatComponent implements OnInit, OnDestroy {
  private readonly SMALL_BREAKPOINT = '(max-width: 1023px)';

  currentVoice: RpVoice = 'narrator';
  recentCharas: RpChara[] = [];
  msgBoxContent = '';

  isSmall$: Observable<boolean>;
  charaDrawerMode$: Observable<'over'|'side'>;

  charaSelectorOpen = false;

  constructor(
    private router: Router,
    private title: Title,
    private metaService: Meta,
    private breakpointObserver: BreakpointObserver,
    public challengeService: ChallengeService,
    public demoRoom: DemoRoomService,
  ) { }

  ngOnInit() {
    this.title.setTitle('Demo | RPNow');

    this.isSmall$ = this.breakpointObserver.observe(this.SMALL_BREAKPOINT).pipe(
      map(state => state.matches)
    );

    this.charaDrawerMode$ = this.isSmall$.pipe(
      map(isSmall => isSmall ? 'over' : 'side')
    );

    this.metaService.addTag({ name: 'description', content:
      'Learn how to use RPNow.'
    });

    this.demoRoom.start();
  }

  ngOnDestroy() {
    this.metaService.removeTag('name="description"');
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

  async createNewChara($event: {name: string, color: string}) {
    const challenge = await this.challengeService.challenge$;

    this.closeCharaSelectorIfOverlay();
    const chara: RpChara = {
      _id: Math.random() + '',
      ...$event,
      challenge: challenge.hash,
      timestamp: Date.now() / 1000
    };
    this.demoRoom.addChara(chara);
    this.currentVoice = chara;
    this.updateRecentCharas(chara);
  }

  async editChara($event: {id: string, name: string, color: string}) {
    this.demoRoom.editChara($event.id, $event.name, $event.color);

    // manually update the current char if we just edited it
    if (!isSpecialVoice(this.currentVoice) && this.currentVoice._id === $event.id) {
      this.currentVoice = (await this.demoRoom.charas$.pipe(take(1)).toPromise()).find(c => c._id === $event.id);
    }
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

  async sendMessage(content: string, voice: RpChara) {
    const challenge = await this.challengeService.challenge$;

    const msg = {
      _id: Math.random() + '',
      content,
      ...typeFromVoice(voice),
      challenge: challenge.hash,
      timestamp: Date.now() / 1000
    };

    this.demoRoom.addMessage(msg);

    // erase saved message box content upon successful message delivery
    if (content === this.msgBoxContent) {
      this.msgBoxContent = '';
    }
  }

  editMessageContent(id: RpMessageId, content: string) {
    this.demoRoom.editMessageContent(id, content);
  }

  onDeleteMessage(id: RpMessageId) {
    this.demoRoom.deleteMesage(id);
  }

  onUndeleteMessage(id: RpMessageId) {
    this.demoRoom.undeleteMesage(id);
  }

  async sendImage(url: string) {
    const challenge = await this.challengeService.challenge$;

    const msg: RpMessage = {
      _id: Math.random() + '',
      type: 'image',
      url,
      challenge: challenge.hash,
      timestamp: Date.now() / 1000
    };
    this.demoRoom.addMessage(msg);
  }

}
