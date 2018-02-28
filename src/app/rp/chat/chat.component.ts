import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RpService, RpVoice } from '../rp.service';
import { CharaSelectorService } from './chara-selector.service';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { MatDialog } from '@angular/material/dialog';
import { NewCharaComponent } from './new-chara/new-chara.component';

@Component({
  templateUrl: 'chat.html',
  styles: [],
  providers: [CharaSelectorService]
})
export class ChatComponent implements OnInit {

  @ViewChild('charaMenu') charaMenu: MatSidenav;

  public currentChara$: BehaviorSubject<RpVoice>;

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) { }

  ngOnInit() {
    this.charaSelectorService.setInstance(this.charaMenu);
    this.currentChara$ = this.charaSelectorService.currentChara$;
  }

  public setVoice(voice: RpVoice) {
    this.charaSelectorService.currentChara$.next(voice);
  }

  public newChara() {
    let dialogRef = this.dialog.open(NewCharaComponent, { viewContainerRef: this.viewContainerRef });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.charaSelectorService.currentChara$.next(chara);
    })
  }
}
