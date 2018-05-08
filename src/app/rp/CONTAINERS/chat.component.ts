import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy, ViewContainerRef } from '@angular/core';
import { RpService, RpMessage, RpChara, RpVoice } from '../rp.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { MatSnackBar } from '@angular/material/snack-bar';
import { scan } from 'rxjs/operators/scan';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';
import { tap } from 'rxjs/operators/tap';
import { MainMenuService } from '../main-menu.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { OptionsService } from '../options.service';
import { TrackService } from '../../track.service';
import { MatDialog } from '@angular/material/dialog';
import { NewCharaComponent } from '../chat/new-chara/new-chara.component';

@Component({
  template: `
    <mat-sidenav-container fxFill>

      <mat-sidenav-content fxLayout="column">

        <title-bar [title]="rp.title" [tooltip]="rp.desc" (clickMenu)="openMenu()" style="z-index:1"></title-bar>

        <rp-message-list class="flex-scroll-container" #messageContainer [messages]="messages$|async"></rp-message-list>

        <send-box [(content)]="options.msgBoxContent" [voice]="currentChara$|async" [pressEnterToSend]="options.pressEnterToSend$|async" (onSendMessage)="sendMessage($event[0],$event[1])" (changeCharacter)="openCharaSelector()"></send-box>

      </mat-sidenav-content>

      <mat-sidenav position="end" mode="over" [(opened)]="charaSelectorOpen">

        <chara-drawer-contents [charas]="sortedCharas$|async" [recentCharas]="recentCharas$|async" [currentChara]="currentChara$|async" (closeDrawer)="closeCharaSelector()" (onSetVoice)="setVoice($event)" (openCharaCreator)="openCharaCreator()"></chara-drawer-contents>

      </mat-sidenav>

    </mat-sidenav-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit {

  @ViewChild('messageContainer', { read: ElementRef }) messageContainer: ElementRef;
  private el: HTMLDivElement;

  private subscription: Subscription;
  private subscription2: Subscription;

  public messages$: Observable<RpMessage[]>
  public currentChara$: BehaviorSubject<RpVoice>;
  public sortedCharas$: Observable<RpChara[]>;
  public recentCharas$: Observable<RpChara[]>;

  charaSelectorOpen: boolean = false;

  constructor(
    public rp: RpService,
    public options: OptionsService,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
    private mainMenuService: MainMenuService,
    private snackbar: MatSnackBar,
    private track: TrackService
  ) { }

  ngOnInit() {
    this.el = this.messageContainer.nativeElement as HTMLDivElement;

    this.currentChara$ = new BehaviorSubject(this.rp.getVoice(this.options.msgBoxVoice));
    this.subscription2 = this.currentChara$.subscribe(voice => this.options.msgBoxVoice$.next(typeof voice === 'string' ? voice : voice._id));

    this.messages$ = this.rp.messages$.pipe(
      scan(({firstIdx}:{firstIdx:number, msgs:RpMessage[]}, msgs:RpMessage[]) => {
        if (this.isAtBottom()) return { msgs, firstIdx: Math.max(msgs.length-60, 0) };
        else return { msgs, firstIdx: Math.max(msgs.length-300, 0, firstIdx) }
      }, {firstIdx: 0, msgs: <RpMessage[]>null}),
      map(({msgs, firstIdx}) => msgs.slice(firstIdx))
    )
    
    this.subscription = this.rp.newMessages$.subscribe(() => this.updateScroll())
    this.updateScroll();
    
    this.sortedCharas$ = this.rp.charas$.pipe(
      map(charas => [...charas].sort((a,b) => a.name.localeCompare(b.name)))
    );

    this.recentCharas$ = this.currentChara$.pipe(
      filter(chara => typeof chara !== 'string'),
      scan((arr:RpChara[], chara:RpChara) => [
        chara, ...arr.filter(c => c._id !== chara._id)
      ].slice(0,5), this.options.recentCharas.map(id => this.rp.charasById.get(id))),
      tap((charas:RpChara[]) => this.options.recentCharas = charas.map(c => c._id)), // TODO should probably subscribe here, not use 'do' operator
      map((charas:RpChara[]) => [...charas].sort((a,b) => a.name.localeCompare(b.name)))
    )
  }

  isAtBottom() {
    return this.el.scrollHeight - this.el.scrollTop - this.el.offsetHeight < 1;
  }

  updateScroll() {
    if (this.isAtBottom()) {
      setImmediate(() => this.el.scrollTop = this.el.scrollHeight);
    }
    else {
      this.snackbar.open('New messages below!','Close', {
        duration: 2000,
        verticalPosition: 'top'
      })
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.subscription2.unsubscribe();
  }

  openMenu() {
    this.mainMenuService.menu.open();
  }

  openCharaSelector() {
    this.charaSelectorOpen = true;
  }

  closeCharaSelector() {
    this.charaSelectorOpen = false;
  }

  openCharaCreator() {
    let dialogRef = this.dialog.open(NewCharaComponent, { viewContainerRef: this.viewContainerRef });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.setVoice(chara);
    })
  }

  setVoice(voice: RpVoice) {
    this.track.event('Charas', 'pick', typeof voice === 'string' ? voice : 'chara');
    
    this.currentChara$.next(voice);
    this.closeCharaSelector();
  }

  sendMessage(content:string, voice:RpChara) {
    this.rp.addMessage(content, voice);
  }

}
