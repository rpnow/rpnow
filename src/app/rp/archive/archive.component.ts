import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Rp } from '../../rp.service';

@Component({
  templateUrl: 'archive.html',
  styles: []
})
export class ArchiveComponent implements OnInit {

  public rp: Rp;
  public page: number;
  public size: number = 20;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(map => this.page = +map.get('page'));
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

  goToPage(page: number) {
    this.router.navigate(['rp', this.rp.rpCode, page+1]);
  }

}
