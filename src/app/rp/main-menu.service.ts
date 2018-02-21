import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

@Injectable()
export class MainMenuService {

  constructor() { }

  private _menu: MatSidenav;

  get menu() {
    return this._menu;
  }

  public setInstance(instance: MatSidenav) {
    this._menu = instance;
  }

}
