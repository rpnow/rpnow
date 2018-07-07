import { Component, OnInit, ChangeDetectionStrategy, HostBinding, HostListener, Output, EventEmitter, ElementRef, Input } from '@angular/core';

@Component({
  selector: 'rpn-scroll-anchor',
  template: `
    <ng-content></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollAnchorComponent implements OnInit {

  constructor(private elementRef: ElementRef) {}

  @HostBinding('class') _class = 'flex-scroll-container';

  @Output() readonly atBottomChanged = new EventEmitter<boolean>();

  @Input() set watch(value: any) {
    this.checkHeight();
  }

  // 31 is because the padding on the rp message list is 20+10.
  // So, this comparison needs to be greater than 30 for the initial page load
  // Not sure why exactly.
  private readonly tolerance = 31;

  private bottomDistance = 0;

  private get atBottom() {
    return this.bottomDistance < this.tolerance;
  }

  private get el() {
    return this.elementRef.nativeElement;
  }

  ngOnInit() {
    this.atBottomChanged.emit(this.atBottom);

    this.checkHeight();
  }

  @HostListener('scroll', ['$event']) onScroll($event) {
    const { scrollHeight, scrollTop, offsetHeight } = this.el;

    this.bottomDistance = (scrollHeight - scrollTop - offsetHeight);
    this.atBottomChanged.emit(this.atBottom);
  }

  checkHeight() {
    const wasAtBottom = this.atBottom;
    const lastBottomDistance = this.bottomDistance;

    setTimeout(() => {
      if (wasAtBottom) {
        this.el.scrollTop = this.el.scrollHeight - this.el.offsetHeight - lastBottomDistance;
      }
    }, 1);
  }

}
