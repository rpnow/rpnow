import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RpService, RpMessage } from '../rp.service';
import { Observable } from 'rxjs/Observable';
import { combineLatest } from 'rxjs/observable/combineLatest'
import { map } from 'rxjs/operators/map';

@Component({
  template: `
    <section fxFill fxLayout="column">

      <title-bar style="z-index:1"></title-bar>

      <rp-paginator [pageNum]="pageNum$|async" [pageCount]="pageCount$|async" (pageNumChange)="pageNumChange($event)"></rp-paginator>

      <rp-message-list class="flex-scroll-container" #messageContainer [messages]="messages$|async"></rp-message-list>

    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveComponent {

  public readonly size: number = 20;

  public pageNum$: Observable<number>;
  public pageCount$: Observable<number>;
  public messages$: Observable<RpMessage[]>;

  constructor(
    public rp: RpService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.pageNum$ = this.route.paramMap.pipe(
      map(map => +map.get('page'))
    );

    this.pageCount$ = this.rp.messages$.pipe(
      map(msgs => Math.ceil(msgs.length/this.size))
    );

    this.messages$ = combineLatest(
      this.rp.messages$,
      this.pageNum$,
      (msgs, page) => msgs.slice((page-1)*this.size, page*this.size)
    )
  }

  pageNumChange(page: number) {
    this.router.navigate(['../', page], { relativeTo: this.route })
  }

}
