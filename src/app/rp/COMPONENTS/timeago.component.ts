import { Component, OnInit, ChangeDetectionStrategy, Input, OnDestroy, HostBinding, ChangeDetectorRef } from '@angular/core';
import * as distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import * as format from 'date-fns/format';

const LONG_FORMAT = 'MMMM Do[,] YYYY [at] h:mm A'

@Component({
  selector: '[timeAgo]',
  template: `
    {{ timeAgoText }}
    <ng-container *ngIf="timeAgoEditedDate">(Edited)</ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeagoComponent implements OnInit, OnDestroy {

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  timeAgoDate: Date;
  timeAgoEditedDate: Date;

  timeAgoText: string;
  @HostBinding('title') timeAgoTitleText: string;

  timerHandle: number;

  @Input('timeAgo') set _timeAgo(ts: number) {
    this.timeAgoDate = ts ? new Date(ts) : null
    this.updateRelativeTime()
    this.updateAbsoluteTimes()
  }
  @Input('timeAgoEdited') set _timeAgoEdited(ts: number) {
    this.timeAgoEditedDate  = ts ? new Date(ts) : null
    this.updateAbsoluteTimes()
  }

  ngOnInit() {
    this.timerHandle = setInterval(() => {
      this.updateRelativeTime()
      this.changeDetectorRef.markForCheck()
    }, 60*1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerHandle);
  }

  updateRelativeTime() {
    if (!this.timeAgoDate) {
      this.timeAgoText = null;
    }
    else {
      this.timeAgoText = distanceInWordsToNow(this.timeAgoDate) + ' ago';
    }

  }

  updateAbsoluteTimes() {
    if (!this.timeAgoDate) {
      this.timeAgoTitleText = null;
    }
    else {
      this.timeAgoTitleText = (this.timeAgoEditedDate) ?
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}\nEdited ${format(this.timeAgoEditedDate, LONG_FORMAT)}`) :
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}`)
    }
  }

}
