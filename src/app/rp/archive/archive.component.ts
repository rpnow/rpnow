import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RpService } from '../rp.service';

@Component({
  templateUrl: 'archive.html',
  styles: []
})
export class ArchiveComponent {

  public page: number;
  public size: number = 20;

  constructor(
    public rp: RpService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(map => this.page = +map.get('page'));
  }

  goToPage(page: number) {
    this.router.navigate(['rp', this.rp.rpCode, page+1]);
  }

}
