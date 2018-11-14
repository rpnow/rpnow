import { Component, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MainMenuService } from '../services/main-menu.service';
import { OptionsService } from '../services/options.service';
import { RpMessageId } from '../models/rp-message';
import { RpPageResponse, RoomService } from '../services/room.service';
import { RpCodeService } from '../services/rp-code.service';
import { Observable, merge, of } from 'rxjs';
import { map, switchMap, share, tap } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { RpVoiceSerialized } from './../models/rp-voice';

@Component({
  selector: 'rpn-archive',
  template: `
    <rpn-title-bar [rpTitle]="(pageInfo$|async)?.title" [desc]="(pageInfo$|async)?.desc" (clickMenu)="openMenu()" style="z-index:1"></rpn-title-bar>

    <rpn-paginator [pageNum]="(pageNum$|async)" [pageCount]="(pageInfo$|async)?.pageCount" (pageNumChange)="pageNumChange($event)"></rpn-paginator>

    <ng-container *ngIf="pageInfo$|async as pageInfo">
      <rpn-message-list class="flex-scroll-container" #messageContainer
        [messages]="pageInfo.msgs"
        [charas]="pageInfo.charas"
        [challenge]="null"
        [showMessageDetails]="options.showMessageDetails$|async"
        [pressEnterToSend]="options.pressEnterToSend$|async"
        (editMessage)="editMessage($event[0], $event[1], $event[2])"
      ></rpn-message-list>
    </ng-container>

    <div *ngIf="(pageInfo$|async) == null" class="center-contents">
      <p>Loading page {{ pageNum$|async }}...</p>
      <mat-spinner></mat-spinner>
    </div>
  `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .center-contents {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 20px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveComponent implements OnInit {

  @ViewChild('messageContainer', { read: ElementRef }) messageContainer: ElementRef;

  pageNum$: Observable<number>;
  pageInfo$: Observable<RpPageResponse>;

  constructor(
    private rpCodeService: RpCodeService,
    private title: Title,
    private roomService: RoomService,
    public options: OptionsService,
    public mainMenuService: MainMenuService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.pageNum$ = this.route.paramMap.pipe(
      map(params => +params.get('page'))
    );

    this.pageInfo$ = this.pageNum$.pipe(
      switchMap(pageNum => merge(
        of(null),
        this.roomService.getPage(this.rpCodeService.rpCode, pageNum)
      )),
      share(),
      tap(info => {
        if (info == null) {
          this.title.setTitle('Loading... | RPNow');
        } else {
          this.title.setTitle(info.title + ' | RPNow');
        }
      })
    );
  }

  pageNumChange(page: number) {
    this.router.navigate(['../', page], { relativeTo: this.route });
    if (this.messageContainer) {
      (this.messageContainer.nativeElement as HTMLElement).scrollTop = 0;
    }
  }

  openMenu() {
    this.mainMenuService.menu.open();
  }

  editMessage(id: RpMessageId, content: string, voice: RpVoiceSerialized) {
    // TODO make it possible to edit from the archive again
    // this.rp.editMessage(id, content);
  }

}
