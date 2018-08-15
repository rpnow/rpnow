import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RpComponent } from './containers/rp.component';
import { ArchiveComponent } from './containers/archive.component';
import { ChatComponent } from './containers/chat.component';
import { DemoChatComponent } from './containers/demo-chat.component';

const routes: Routes = [
  {
    path: 'demo',
    component: DemoChatComponent,
  },
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
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class RpRoutingModule { }
