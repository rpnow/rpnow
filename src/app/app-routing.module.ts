import { NgModule } from '@angular/core';
import { RouterModule, Routes, PreloadAllModules } from '@angular/router';

import { NotFoundComponent } from './not-found/not-found.component';

const appRoutes: Routes = [
  {
    path: 'rp',
    loadChildren: 'app/rp/rp.module#RpModule'
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      paramsInheritanceStrategy: 'always',
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
