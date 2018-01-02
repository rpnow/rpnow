import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Router, Routes, Resolve, ActivatedRouteSnapshot, CanDeactivate } from '@angular/router';

import { RpComponent } from './rp/rp.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TitleComponent } from './title/title.component';
import { ArchiveComponent } from './rp/archive/archive.component';
import { ChatComponent } from './rp/chat/chat.component';
import { RpService } from './rp.service';

@Injectable()
export class RpResolverService implements Resolve<any> {
  constructor(private service: RpService, private router: Router) { }

  resolve(route: ActivatedRouteSnapshot) {
    let rpCode = route.paramMap.get('rpCode');
    return this.service.join(rpCode).catch(err => {
      if (err.code === 'RP_NOT_FOUND') {
        this.router.navigate(['/rp-not-found', rpCode])
        return err;
      }

      throw err;
    });
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
