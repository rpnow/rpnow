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
    // defunct stats route - send back to main rp chat
    path: ':rpCode/stats',
    redirectTo: ':rpCode'
  },
  {
    /**
     * defunct exports route -
     * some users were linking to it directly as a means of distributing rp's I think?
     * just send them back to the main page
     */
    path: ':rpCode/export',
    redirectTo: '/'
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
