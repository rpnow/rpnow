import { Injectable } from '@angular/core';
import { TrackService } from '../../track.service';
import { RpCodeService } from './rp-code.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class DownloadJsonService {

  constructor(
    private rpCodeService: RpCodeService,
    private track: TrackService
  ) { }

  public downloadJson() {
    this.track.event('Download', 'Download json');
    const url = `${environment.apiUrl}/api/rp/${this.rpCodeService.rpCode}/download.json`;
    window.open(url, '_blank');
  }

}
