import { Injectable } from '@angular/core';
import { TrackService } from '../../track.service';
import { RpCodeService } from './rp-code.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class DownloadTxtService {

  constructor(
    private rpCodeService: RpCodeService,
    private track: TrackService
  ) { }

  public downloadTxt(includeOOC: boolean) {
    this.track.event('Download', 'txt', includeOOC ? 'ooc: yes' : 'ooc: no');
    const url = `${environment.apiUrl}/api/rp/${this.rpCodeService.rpCode}/download.txt${includeOOC ? '?includeOOC=true' : ''}`;
    window.open(url, '_blank');
  }

}
