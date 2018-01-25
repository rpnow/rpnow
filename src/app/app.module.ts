import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppComponent } from './app.component';
import { TitleComponent } from './title/title.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { RpComponent } from './rp/rp.component';
import { RpService } from './rp.service';
import { ChallengeService } from './challenge.service';
import { AppRoutingModule } from './app-routing.module';
import { ArchiveComponent } from './rp/archive/archive.component';
import { ChatComponent } from './rp/chat/chat.component';
import { RpMessageComponent } from './rp/rp-message/rp-message.component';
import { IpidComponent } from './rp/ipid/ipid.component';
import { MessageBoxComponent } from './rp/chat/message-box/message-box.component';
import { TitleBarComponent } from './rp/title-bar/title-bar.component';


@NgModule({
  declarations: [
    AppComponent,
    TitleComponent,
    NotFoundComponent,
    RpComponent,
    ArchiveComponent,
    ChatComponent,
    RpMessageComponent,
    IpidComponent,
    MessageBoxComponent,
    TitleBarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FlexLayoutModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatTooltipModule,
    MatToolbarModule
  ],
  providers: [RpService, ChallengeService],
  bootstrap: [AppComponent]
})
export class AppModule { }
