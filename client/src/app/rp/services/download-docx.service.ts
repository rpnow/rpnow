import { Injectable } from '@angular/core';
import { TrackService } from '../../track.service';
import { RpCodeService } from './rp-code.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class DownloadDocxService {

  constructor(
    private rpCodeService: RpCodeService,
    private track: TrackService
  ) { }

  public downloadDocx(includeOOC: boolean) {
    this.track.event('Download', 'Download docx', includeOOC ? 'ooc: yes' : 'ooc: no');
    const url = `${environment.apiUrl}/api/rp/${this.rpCodeService.rpCode}/download.docx${includeOOC ? '?includeOOC=true' : ''}`;
    window.open(url, '_blank');
  }

}
