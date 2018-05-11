import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

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

import { RpComponent } from './CONTAINERS/rp.component';
import { ArchiveComponent } from './CONTAINERS/archive.component';
import { ChatComponent } from './CONTAINERS/chat.component';
import { RpMessageComponent } from './COMPONENTS/rp-message.component';
import { IpidComponent } from './COMPONENTS/ipid.component';
import { PaginatorComponent } from './COMPONENTS/paginator.component';
import { SendBoxComponent } from './COMPONENTS/send-box.component';
import { TitleBarComponent } from './COMPONENTS/title-bar.component';
import { CharaDialogComponent } from './COMPONENTS/chara-dialog.component';
import { BlackOrWhitePipe } from './pipes/black-or-white.pipe';
import { DownloadDialogComponent } from './COMPONENTS/download-dialog.component';
import { ContactDialogComponent } from './COMPONENTS/contact-dialog.component';
import { AboutDialogComponent } from './COMPONENTS/about-dialog.component';
import { TermsDialogComponent } from './COMPONENTS/terms-dialog.component';
import { FormatGuideDialog } from './COMPONENTS/format-guide-dialog.component';
import { RpMessagePipe } from './pipes/rp-message.pipe';
import { RpRoutingModule } from './rp-routing.module';
import { ImageDialogComponent } from './COMPONENTS/image-dialog.component';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { OptionsDialogComponent } from './COMPONENTS/options-dialog.component';
import { CharaDrawerComponent } from './COMPONENTS/chara-drawer.component';
import { BannerMessageComponent } from './banner-message/banner-message.component';
import { CharaIconDirective } from './COMPONENTS/chara-icon.directive';
import { TimeagoComponent } from './COMPONENTS/timeago.component';
import { MessageListComponent } from './COMPONENTS/message-list.component';


@NgModule({
  declarations: [
    RpComponent,
    ArchiveComponent,
    ChatComponent,
    RpMessageComponent,
    IpidComponent,
    PaginatorComponent,
    SendBoxComponent,
    TitleBarComponent,
    CharaDialogComponent,
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
    CharaDrawerComponent,
    BannerMessageComponent,
    CharaIconDirective,
    TimeagoComponent,
    MessageListComponent
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
    AboutDialogComponent,
    TermsDialogComponent,
    FormatGuideDialog,
    OptionsDialogComponent
  ]
})
export class RpModule { }
