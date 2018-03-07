import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RpService } from '../rp.service';
import { CharaSelectorService } from './chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription } from 'rxjs/Subscription';

@Component({
  templateUrl: 'chat.html',
  styles: [],
  providers: [CharaSelectorService]
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;
  @ViewChild('messageContainer') messageContainer: ElementRef;

  private subscription: Subscription;

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
  ) { }

  ngOnInit() {
    this.charaSelectorService.setInstance(this.charaMenu);

    this.subscription = this.rp.newMessages$.subscribe(() => this.updateScroll())
    this.updateScroll();
  }

  updateScroll() {
    let el = this.messageContainer.nativeElement as HTMLDivElement;
    if (el.scrollHeight - el.scrollTop - el.offsetHeight < 1) {
      setImmediate(() => el.scrollTop = el.scrollHeight);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
