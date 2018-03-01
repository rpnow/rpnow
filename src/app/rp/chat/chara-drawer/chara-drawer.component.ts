import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpVoice, RpService } from '../../rp.service';
import { CharaSelectorService } from '../chara-selector.service';
import { MatDialog } from '@angular/material/dialog';
import { NewCharaComponent } from '../new-chara/new-chara.component';

@Component({
  selector: 'chara-drawer-contents',
  templateUrl: 'chara-drawer.html',
  styles: []
})
export class CharaDrawerComponent implements OnInit {

  public currentChara$: BehaviorSubject<RpVoice>;

  constructor(
    public rp: RpService,
    private charaSelectorService: CharaSelectorService,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit() {
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

  close() {
    this.charaSelectorService.menu.close();
  }

}
