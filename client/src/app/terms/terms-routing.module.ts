import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TermsComponent } from './terms.component';

const routes: Routes = [
  {
    path: '',
    component: TermsComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forChild([{path: '', component: TermsComponent}])
  ],
  exports: [RouterModule]
})
export class TermsRoutingModule { }
