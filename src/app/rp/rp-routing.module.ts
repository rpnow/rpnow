import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Router, Routes, Resolve, ActivatedRouteSnapshot, CanDeactivate } from '@angular/router';

import { RpComponent } from './rp.component';
import { ArchiveComponent } from './archive/archive.component';
import { ChatComponent } from './chat/chat.component';
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

const routes: Routes = [
  {
    path: ':rpCode',
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
  }
]

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  providers: [RpResolverService, RpDeactivate],
  exports: [RouterModule]
})
export class RpRoutingModule { }
