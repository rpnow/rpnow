import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCheckboxModule } from '@angular/material';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/multicast';
import 'rxjs/add/operator/pluck';
import 'rxjs/add/operator/switchMap';

import { AppComponent } from './app.component';
import { TitleComponent } from './title/title.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { RpComponent } from './rp/rp.component';
import { RpService } from './rp.service';
import { RpResolverService } from './rp-resolver.service';

const appRoutes: Routes = [
  {
    path: 'rp/:rpCode',
    component: RpComponent,
    resolve: {
      rp: RpResolverService
    }
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
  declarations: [
    AppComponent,
    TitleComponent,
    NotFoundComponent,
    RpComponent
  ],
  imports: [
    RouterModule.forRoot(appRoutes),
    BrowserModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    MatCheckboxModule
  ],
  providers: [RpService, RpResolverService],
  bootstrap: [AppComponent]
})
export class AppModule { }
