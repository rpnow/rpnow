import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RpComponent } from './rp.component';
import { ArchiveComponent } from './CONTAINERS/archive.component';
import { ChatComponent } from './CONTAINERS/chat.component';

const routes: Routes = [
  {
    path: ':rpCode',
    component: RpComponent,
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
  exports: [RouterModule]
})
export class RpRoutingModule { }
