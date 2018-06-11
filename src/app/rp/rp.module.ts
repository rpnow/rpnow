import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorPickerModule } from 'ngx-color-picker';

import { RpComponent } from './containers/rp.component';
import { ArchiveComponent } from './containers/archive.component';
import { ChatComponent } from './containers/chat.component';
import { MessageComponent } from './components/message.component';
import { IpidComponent } from './components/ipid.component';
import { PaginatorComponent } from './components/paginator.component';
import { SendBoxComponent } from './components/send-box.component';
import { TitleBarComponent } from './components/title-bar.component';
import { CharaDialogComponent } from './components/chara-dialog.component';
import { BlackOrWhitePipe } from './pipes/black-or-white.pipe';
import { DownloadDialogComponent } from './components/download-dialog.component';
import { ContactDialogComponent } from './components/contact-dialog.component';
import { FormatGuideDialogComponent } from './components/format-guide-dialog.component';
import { MessageContentPipe } from './pipes/message-content.pipe';
import { RpRoutingModule } from './rp-routing.module';
import { ImageDialogComponent } from './components/image-dialog.component';
import { MainMenuComponent } from './components/main-menu.component';
import { OptionsDialogComponent } from './components/options-dialog.component';
import { CharaDrawerComponent } from './components/chara-drawer.component';
import { BannerMessageComponent } from './components/banner-message.component';
import { IconColorDirective } from './components/chara-icon.directive';
import { TimestampComponent } from './components/timestamp.component';
import { MessageListComponent } from './components/message-list.component';
import { LayoutModule } from '@angular/cdk/layout';
import { WelcomeComponent } from './components/welcome.component';
import { NagComponent } from './components/nag.component';


@NgModule({
  declarations: [
    RpComponent,
    ArchiveComponent,
    ChatComponent,
    MessageComponent,
    IpidComponent,
    PaginatorComponent,
    SendBoxComponent,
    TitleBarComponent,
    CharaDialogComponent,
    BlackOrWhitePipe,
    DownloadDialogComponent,
    ImageDialogComponent,
    ContactDialogComponent,
    FormatGuideDialogComponent,
    MessageContentPipe,
    MainMenuComponent,
    OptionsDialogComponent,
    CharaDrawerComponent,
    BannerMessageComponent,
    IconColorDirective,
    TimestampComponent,
    MessageListComponent,
    WelcomeComponent,
    NagComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    LayoutModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatToolbarModule,
    ColorPickerModule,
    RpRoutingModule
  ],
  entryComponents: [
    CharaDialogComponent,
    DownloadDialogComponent,
    ImageDialogComponent,
    ContactDialogComponent,
    FormatGuideDialogComponent,
    OptionsDialogComponent
  ]
})
export class RpModule { }
