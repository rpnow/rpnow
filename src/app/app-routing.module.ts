import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Routes, Resolve, ActivatedRouteSnapshot, CanDeactivate } from '@angular/router';

import { RpComponent } from './rp/rp.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TitleComponent } from './title/title.component';
import { ArchiveComponent } from './rp/archive/archive.component';
import { ChatComponent } from './rp/chat/chat.component';
import { RpService } from './rp.service';

@Injectable()
export class RpResolverService implements Resolve<any> {
  constructor(private service: RpService) { }

  resolve(route: ActivatedRouteSnapshot) {
    let rpCode = route.paramMap.get('rpCode');
    return this.service.join(rpCode);
  }
}

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
    },
    children: [
      {
        path: '',
        component: ChatComponent
      },
      {
        path: ':page',
        component: ArchiveComponent
      }
    ]
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
