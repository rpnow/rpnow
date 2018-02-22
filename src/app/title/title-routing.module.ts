import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TitleComponent } from './title.component';

const routes: Routes = [
  {
    path: '',
    component: TitleComponent
  }
]

@NgModule({
  imports: [
    RouterModule.forChild([{path:'', component: TitleComponent}])
  ],
  exports: [RouterModule]
})
export class TitleRoutingModule { }
