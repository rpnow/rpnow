import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { RpService, RpMessage } from '../rp.service';
import { CharaSelectorService } from '../chat/chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { MatSnackBar } from '@angular/material/snack-bar';
import { scan } from 'rxjs/operators/scan';
import { map } from 'rxjs/operators/map';
import { MainMenuService } from '../main-menu.service';

@Component({
  template: `
    <mat-sidenav-container fxFill>

      <mat-sidenav-content fxLayout="column">

        <title-bar [title]="rp.title" [tooltip]="rp.desc" (clickMenu)="openMenu()" style="z-index:1"></title-bar>

        <rp-message-list class="flex-scroll-container" #messageContainer [messages]="messages$|async"></rp-message-list>

        <div>
          <rp-message-box></rp-message-box>
        </div>

      </mat-sidenav-content>

      <mat-sidenav #charaMenu position="end" mode="over">

        <chara-drawer-contents></chara-drawer-contents>

      </mat-sidenav>

    </mat-sidenav-container>
  `,
  styles: [],
  providers: [CharaSelectorService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;

  @ViewChild('messageContainer', { read: ElementRef }) messageContainer: ElementRef;
  private el: HTMLDivElement;

  private subscription: Subscription;

  public messages$: Observable<RpMessage[]>

  constructor(
    public rp: RpService,
    public mainMenuService: MainMenuService,
    private charaSelectorService: CharaSelectorService,
    private snackbar: MatSnackBar
  ) { }

  ngOnInit() {
    this.el = this.messageContainer.nativeElement as HTMLDivElement;

    this.charaSelectorService.setInstance(this.charaMenu);

    this.messages$ = this.rp.messages$.pipe(
      scan(({firstIdx}:{firstIdx:number, msgs:RpMessage[]}, msgs:RpMessage[]) => {
        if (this.isAtBottom()) return { msgs, firstIdx: Math.max(msgs.length-60, 0) };
        else return { msgs, firstIdx: Math.max(msgs.length-300, 0, firstIdx) }
      }, {firstIdx: 0, msgs: <RpMessage[]>null}),
      map(({msgs, firstIdx}) => msgs.slice(firstIdx))
    )
    
    this.subscription = this.rp.newMessages$.subscribe(() => this.updateScroll())
    this.updateScroll();
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
  }

  openMenu() {
    this.mainMenuService.menu.open();
  }

}
