import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RpService, RpMessage } from '../rp.service';
import { CharaSelectorService } from './chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  templateUrl: 'chat.html',
  styles: [],
  providers: [CharaSelectorService]
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;

  @ViewChild('messageContainer') messageContainer: ElementRef;
  private el: HTMLDivElement;

  private subscription: Subscription;

  public messages$: Observable<RpMessage[]>

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
    private snackbar: MatSnackBar
  ) { }

  ngOnInit() {
    this.el = this.messageContainer.nativeElement as HTMLDivElement;

    this.charaSelectorService.setInstance(this.charaMenu);

    this.messages$ = this.rp.messages$
      .scan(({firstIdx}, msgs) => {
        if (this.isAtBottom()) return { msgs, firstIdx: Math.max(msgs.length-10, 0) };
        else return { msgs, firstIdx }
      }, {firstIdx: 0, msgs: <RpMessage[]>null})
      .map(({msgs, firstIdx}) => msgs.slice(firstIdx))

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
}
