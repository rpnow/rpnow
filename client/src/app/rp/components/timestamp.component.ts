import { Component, OnInit, ChangeDetectionStrategy, Input, OnDestroy, HostBinding, ChangeDetectorRef } from '@angular/core';
import * as distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import * as format from 'date-fns/format';

const LONG_FORMAT = 'MMMM Do[,] YYYY [at] h:mm A';

@Component({
  selector: 'rpn-timestamp',
  template: `
    {{ timeAgoText }}
    <ng-container *ngIf="timeAgoEditedDate">(Edited)</ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimestampComponent implements OnInit, OnDestroy {

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  timeAgoDate: Date;
  timeAgoEditedDate: Date;

  timeAgoText: string;
  @HostBinding('title') timeAgoTitleText: string;

  timerHandle: number;

  @Input('createdAt') set _createdAt(ts: number) {
    this.timeAgoDate = ts ? new Date(ts * 1000) : null;
    this.updateRelativeTime();
    this.updateAbsoluteTimes();
  }
  @Input('editedAt') set _editedAt(ts: number) {
    this.timeAgoEditedDate  = ts ? new Date(ts * 1000) : null;
    this.updateAbsoluteTimes();
  }

  ngOnInit() {
    this.timerHandle = setInterval(() => {
      this.updateRelativeTime();
      this.changeDetectorRef.markForCheck();
    }, 60 * 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerHandle);
  }

  updateRelativeTime() {
    if (!this.timeAgoDate) {
      this.timeAgoText = null;
    } else {
      this.timeAgoText = distanceInWordsToNow(this.timeAgoDate) + ' ago';
    }

  }

  updateAbsoluteTimes() {
    if (!this.timeAgoDate) {
      this.timeAgoTitleText = null;
    } else {
      this.timeAgoTitleText = (this.timeAgoEditedDate) ?
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}\nEdited ${format(this.timeAgoEditedDate, LONG_FORMAT)}`) :
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}`);
    }
  }

}
