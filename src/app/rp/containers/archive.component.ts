import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RpService } from '../services/rp.service';
import { Observable } from 'rxjs/Observable';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { map } from 'rxjs/operators/map';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { RpMessage } from '../models/rp-message';

@Component({
  template: `
    <section fxFill fxLayout="column">

      <rpn-title-bar [title]="'Page '+(pageNum$|async)+', '+rp.title" [tooltip]="rp.desc" (clickMenu)="openMenu()" style="z-index:1"></rpn-title-bar>

      <rpn-paginator [pageNum]="pageNum$|async" [pageCount]="pageCount$|async" (pageNumChange)="pageNumChange($event)"></rpn-paginator>

      <rpn-message-list class="flex-scroll-container" #messageContainer
        [messages]="messages$|async"
        [charas]="rp.charas$|async"
        [challenge]="(options.challenge$|async).hash"
        [showMessageDetails]="options.showMessageDetails$|async"
        [pressEnterToSend]="options.pressEnterToSend$|async"
        (editMessageContent)="editMessageContent($event[0], $event[1])"
      ></rpn-message-list>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveComponent implements OnInit {

  @ViewChild('messageContainer', { read: ElementRef }) messageContainer: ElementRef;

  public readonly size: number = 20;

  public pageNum$: Observable<number>;
  public pageCount$: Observable<number>;
  public messages$: Observable<RpMessage[]>;

  constructor(
    public rp: RpService,
    public options: OptionsService,
    public mainMenuService: MainMenuService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.pageNum$ = this.route.paramMap.pipe(
      map(params => +params.get('page'))
    );

    this.pageCount$ = this.rp.messages$.pipe(
      map(msgs => Math.ceil(msgs.length / this.size))
    );

    this.messages$ = combineLatest(
      this.rp.messages$,
      this.pageNum$,
      (msgs, page) => msgs.slice((page - 1) * this.size, page * this.size)
    );
  }

  pageNumChange(page: number) {
    this.router.navigate(['../', page], { relativeTo: this.route });
    (this.messageContainer.nativeElement as HTMLElement).scrollTop = 0;
  }

  openMenu() {
    this.mainMenuService.menu.open();
  }

  editMessageContent(id: string, content: string) {
    this.rp.editMessage(id, content);
  }

}
