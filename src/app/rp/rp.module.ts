import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/merge';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/scan';

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

import { RpComponent } from './rp.component';
import { ArchiveComponent } from './archive/archive.component';
import { ChatComponent } from './chat/chat.component';
import { RpMessageComponent } from './rp-message/rp-message.component';
import { IpidComponent } from './rp-message/ipid/ipid.component';
import { MessageBoxComponent } from './chat/message-box/message-box.component';
import { TitleBarComponent } from './title-bar/title-bar.component';
import { NewCharaComponent } from './chat/new-chara/new-chara.component';
import { BlackOrWhitePipe } from './black-or-white.pipe';
import { DownloadDialogComponent } from './download-dialog/download-dialog.component';
import { ContactDialogComponent } from './info-dialogs/contact-dialog/contact-dialog.component';
import { AboutDialogComponent } from './info-dialogs/about-dialog/about-dialog.component';
import { TermsDialogComponent } from './info-dialogs/terms-dialog/terms-dialog.component';
import { FormatGuideDialog } from './info-dialogs/format-guide-dialog/format-guide-dialog.component';
import { RpMessagePipe } from './rp-message/rp-message.pipe';
import { RpRoutingModule } from './rp-routing.module';
import { ImageDialogComponent } from './chat/image-dialog/image-dialog.component';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { OptionsDialogComponent } from './options-dialog/options-dialog.component';
import { CharaDrawerComponent } from './chat/chara-drawer/chara-drawer.component';


@NgModule({
  declarations: [
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
    ImageDialogComponent,
    ContactDialogComponent,
    AboutDialogComponent,
    TermsDialogComponent,
    FormatGuideDialog,
    RpMessagePipe,
    MainMenuComponent,
    OptionsDialogComponent,
    CharaDrawerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
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
    ColorPickerModule,
    RpRoutingModule
  ],
  entryComponents: [
    NewCharaComponent,
    DownloadDialogComponent,
    ImageDialogComponent,
    ContactDialogComponent,
    AboutDialogComponent,
    TermsDialogComponent,
    FormatGuideDialog,
    OptionsDialogComponent
  ]
})
export class RpModule { }
