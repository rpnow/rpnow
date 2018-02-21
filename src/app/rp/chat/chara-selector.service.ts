import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { RpChara } from '../rp.service';

@Injectable()
export class CharaSelectorService {

  constructor() { }

  private _menu: MatSidenav;

  get menu() {
    return this._menu;
  }

  public setInstance(instance: MatSidenav) {
    this._menu = instance;
  }

  public readonly currentChara$: BehaviorSubject<RpChara|string> = new BehaviorSubject('narrator');

}
