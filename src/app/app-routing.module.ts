import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RpComponent } from './rp/rp.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { TitleComponent } from './title/title.component';
import { ArchiveComponent } from './rp/archive/archive.component';

const appRoutes: Routes = [
  {
    path: 'rp',
    loadChildren: 'app/rp/rp.module#RpModule'
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
    RouterModule.forRoot(appRoutes, { paramsInheritanceStrategy: 'always' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
