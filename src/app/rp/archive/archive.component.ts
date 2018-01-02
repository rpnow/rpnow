import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp } from '../../rp.service';

@Component({
  selector: 'app-archive',
  template: `
    <p>
      Looking at page #{{page}}
    </p>
    <div *ngIf="rp">
    <p *ngFor="let msg of rp.messages">
      {{msg.content}}
    </p>
    </div>
  `,
  styles: []
})
export class ArchiveComponent implements OnInit {

  public rp: Rp;
  public page: number;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.paramMap.subscribe(map => this.page = +map.get('page'));
    this.route.parent.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
  }

}
