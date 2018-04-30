import { Component, OnInit, ViewContainerRef, ChangeDetectionStrategy } from '@angular/core';
import { RpVoice, RpService, RpChara } from '../../rp.service';
import { CharaSelectorService } from '../chara-selector.service';
import { MatDialog } from '@angular/material/dialog';
import { NewCharaComponent } from '../new-chara/new-chara.component';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { OptionsService } from '../../options.service';
import { filter } from 'rxjs/operators/filter';
import { scan } from 'rxjs/operators/scan';
import { tap } from 'rxjs/operators/tap';
import { map } from 'rxjs/operators/map';
import { TrackService } from '../../../track.service';

@Component({
  selector: 'chara-drawer-contents',
  templateUrl: 'chara-drawer.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDrawerComponent implements OnInit {

  public currentChara$: BehaviorSubject<RpVoice>;
  public recentCharas$: Observable<RpChara[]>;
  public allCharas$: Observable<RpChara[]>;

  public hasManyCharacters$: Observable<boolean>;

  constructor(
    public rp: RpService,
    private options: OptionsService,
    private charaSelectorService: CharaSelectorService,
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
    private track: TrackService
  ) {}

  ngOnInit() {
    this.currentChara$ = this.charaSelectorService.currentChara$;

    this.recentCharas$ = this.currentChara$.pipe(
      filter(chara => typeof chara !== 'string'),
      scan((arr:RpChara[], chara:RpChara) => [
        chara, ...arr.filter(c => c._id !== chara._id)
      ].slice(0,5), this.options.recentCharas.map(id => this.rp.charasById.get(id))),
      tap((charas:RpChara[]) => this.options.recentCharas = charas.map(c => c._id)), // TODO should probably subscribe here, not use 'do' operator
      map((charas:RpChara[]) => [...charas].sort((a,b) => a.name.localeCompare(b.name)))
    ) as Observable<RpChara[]>
    
    this.allCharas$ = this.rp.charas$.pipe(
      map(charas => [...charas].sort((a,b) => a.name.localeCompare(b.name)))
    );

    this.hasManyCharacters$ = this.rp.charas$.pipe(
      map(charas => charas.length >= 10)
    );
  }

  public setVoice(voice: RpVoice) {
    this.track.event('Charas', 'pick', typeof voice === 'string' ? voice : 'chara');
    
    this.charaSelectorService.currentChara$.next(voice);
    this.close();
  }

  public newChara() {
    let dialogRef = this.dialog.open(NewCharaComponent, { viewContainerRef: this.viewContainerRef });
    dialogRef.beforeClose().subscribe(chara => {
      if (chara) this.setVoice(chara);
    })
  }

  close() {
    this.charaSelectorService.menu.close();
  }

}
