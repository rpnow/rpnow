import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCheckboxModule } from '@angular/material';

import { AppComponent } from './app.component';
import { TitleComponent } from './title/title.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { RpComponent } from './rp/rp.component';
import { RpService } from './rp.service';
import { ChallengeService } from './challenge.service';
import { AppRoutingModule } from './app-routing.module';
import { ArchiveComponent } from './rp/archive/archive.component';
import { ChatComponent } from './rp/chat/chat.component';


@NgModule({
  declarations: [
    AppComponent,
    TitleComponent,
    NotFoundComponent,
    RpComponent,
    ArchiveComponent,
    ChatComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FlexLayoutModule,
    MatCheckboxModule
  ],
  providers: [RpService, ChallengeService],
  bootstrap: [AppComponent]
})
export class AppModule { }
