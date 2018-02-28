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
    private router: Router
  ) { }

  goToPage(page: number) {
    this.router.navigate(['rp', this.rp.rpCode, page+1]);
  }

}
