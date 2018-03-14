import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RpService, RpMessage } from '../rp.service';
import { Observable } from 'rxjs/Observable';

@Component({
  templateUrl: 'archive.html',
  styles: [`
    #pager {
      background-color: #eee;
    }
    :host-context(.dark-theme) #pager {
      background-color: #555;
    }
  `]
})
export class ArchiveComponent {

  public readonly size: number = 20;

  public pageNum$: Observable<number>;
  public pageCount$: Observable<number>;
  public hasNextPage$: Observable<boolean>;
  public hasPrevPage$: Observable<boolean>;
  public messages$: Observable<RpMessage[]>;

  constructor(
    public rp: RpService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.pageNum$ = this.route.paramMap.map(map => +map.get('page'));

    this.pageCount$ = this.rp.messages$.map(msgs => Math.ceil(msgs.length/this.size));

    this.hasNextPage$ = Observable.combineLatest(
      this.pageNum$,
      this.pageCount$,
      (page, count) => page < count
    )

    this.hasPrevPage$ = this.pageNum$.map(num => num > 1);

    this.messages$ = Observable.combineLatest(
      this.rp.messages$,
      this.pageNum$,
      (msgs, page) => msgs.slice((page-1)*this.size, page*this.size)
    )
  }

}
