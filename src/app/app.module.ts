import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';

import 'rxjs/add/operator/map';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorPickerModule } from 'ngx-color-picker';

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
import { NewCharaComponent } from './rp/chat/new-chara/new-chara.component';
import { BlackOrWhitePipe } from './black-or-white.pipe';
import { DownloadDialogComponent } from './rp/download-dialog/download-dialog.component';
import { OptionsService } from './options.service';
import { ContactDialogComponent } from './info-dialogs/contact-dialog/contact-dialog.component';
import { AboutDialogComponent } from './info-dialogs/about-dialog/about-dialog.component';
import { TermsDialogComponent } from './info-dialogs/terms-dialog/terms-dialog.component';
import { FormatGuideDialog } from './info-dialogs/format-guide-dialog/format-guide-dialog.component';
import { RpMessagePipe } from './rp/rp-message/rp-message.pipe';


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
    TitleBarComponent,
    NewCharaComponent,
    BlackOrWhitePipe,
    DownloadDialogComponent,
    ContactDialogComponent,
    AboutDialogComponent,
    TermsDialogComponent,
    FormatGuideDialog,
    RpMessagePipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FlexLayoutModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatTooltipModule,
    MatToolbarModule,
    ColorPickerModule
  ],
  providers: [RpService, ChallengeService, OptionsService],
  bootstrap: [AppComponent],
  entryComponents: [
    NewCharaComponent,
    DownloadDialogComponent,
    ContactDialogComponent,
    AboutDialogComponent,
    TermsDialogComponent,
    FormatGuideDialog
  ]
})
export class AppModule { }
