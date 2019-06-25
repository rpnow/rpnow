import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TitleComponent } from './title.component';
import { TitleRoutingModule } from './title-routing.module';



@NgModule({
  declarations: [
    TitleComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TitleRoutingModule
  ]
})
export class TitleModule { }
