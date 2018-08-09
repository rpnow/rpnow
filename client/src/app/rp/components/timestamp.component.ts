import { Component, OnInit, ChangeDetectionStrategy, Input, OnDestroy, HostBinding, ChangeDetectorRef } from '@angular/core';
import * as format from 'date-fns/format';

const LONG_FORMAT = 'MMMM Do[,] YYYY [at] h:mm A';

@Component({
  selector: 'rpn-timestamp',
  template: `
    {{ timeAgoText }}
    <ng-container *ngIf="hasEditedDate()">(Edited)</ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimestampComponent implements OnInit, OnDestroy {

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  private timeAgoDate: Date;
  private timeAgoEditedDate: Date;

  timeAgoText: string;
  @HostBinding('title') timeAgoTitleText: string;

  private timerHandle: number;

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

  hasEditedDate() {
    return !!this.timeAgoEditedDate;
  }

  private updateRelativeTime() {
    if (!this.timeAgoDate) {
      this.timeAgoText = null;
    } else {
      this.timeAgoText = this.timeAgo(this.timeAgoDate);
    }
  }

  private updateAbsoluteTimes() {
    if (!this.timeAgoDate) {
      this.timeAgoTitleText = null;
    } else {
      this.timeAgoTitleText = (this.timeAgoEditedDate) ?
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}\nEdited ${format(this.timeAgoEditedDate, LONG_FORMAT)}`) :
        (`Posted ${format(this.timeAgoDate, LONG_FORMAT)}`);
    }
  }

  private timeAgo(date: Date): string {
    // close enough
    const periods = [
      {label: 'm', div: 60},
      {label: 'h', div: 24},
      {label: 'd', div: 30},
      {label: 'mo', div: 12},
      {label: 'y', div: Infinity},
    ];

    let t = (Date.now() - date.getTime()) / 1000 / 60;

    while (Math.round(t) >= periods[0].div) t /= periods.shift().div;

    const { label } = periods[0];

    if (Math.round(t) === 0) return 'now';
    return `${Math.round(t)}${label} ago`;
  }
}
