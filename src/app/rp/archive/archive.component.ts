import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RpService, RpMessage } from '../rp.service';
import { Observable } from 'rxjs/Observable';

@Component({
  templateUrl: 'archive.html',
  styles: []
})
export class ArchiveComponent {

  public pageNum$: Observable<number>;
  public messages$: Observable<RpMessage[]>;
  public size: number = 20;

  constructor(
    public rp: RpService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.pageNum$ = this.route.paramMap.map(map => +map.get('page'));

    this.messages$ = Observable.combineLatest(
      this.rp.messages$,
      this.pageNum$,
      (msgs, page) => msgs.slice((page-1)*this.size, page*this.size)
    )
  }

  goToPage(page: number) {
    this.router.navigate(['rp', this.rp.rpCode, page+1]);
  }

}
