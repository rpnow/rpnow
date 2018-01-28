import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Rp, RpChara } from '../../rp.service';
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

  public rp: Rp;

  public currentChara$: BehaviorSubject<string|RpChara>;

  constructor(
    private route: ActivatedRoute,
    private charaSelectorService: CharaSelectorService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.route.data.subscribe((data:{rp:Rp}) => this.rp = data.rp);
    this.charaSelectorService.setInstance(this.charaMenu);
    this.currentChara$ = this.charaSelectorService.currentChara$;
  }

  public sendMessage(message: any) {
    this.rp.addMessage(message);
  }

  public setVoice(voice: string|RpChara) {
    this.charaSelectorService.currentChara$.next(voice);
  }

  public newChara() {
    let dialogRef = this.dialog.open(NewCharaComponent, { data: { rp: this.rp } });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.charaSelectorService.currentChara$.next(chara);
    })
  }
}
