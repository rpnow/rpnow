import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Routes, CanDeactivate } from '@angular/router';

import { RpComponent } from './rp/rp.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TitleComponent } from './title/title.component';
import { RpResolverService } from './rp-resolver.service';

@Injectable()
export class RpDeactivate implements CanDeactivate<RpComponent> {
  canDeactivate(component: RpComponent){
    component.onRouteDeactivate();
    return true;
  }
}

const appRoutes: Routes = [
  {
    path: 'rp/:rpCode',
    component: RpComponent,
    canDeactivate: [RpDeactivate],
    resolve: {
      rp: RpResolverService
    }
  },
  {
    path: '',
    component: TitleComponent
  },
  {
    path: '**',
    component: NotFoundComponent
  }
]

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes)
  ],
  providers: [RpResolverService, RpDeactivate],
  exports: [RouterModule]
})
export class AppRoutingModule { }
