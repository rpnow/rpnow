import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bw'
})
export class BlackOrWhitePipe implements PipeTransform {

  transform(color: string, opacity: number = 1, optional: boolean = false): any {
    if (!color) return color;

    const [r, g, b] = color.match(/[0-9a-f]{2}/g).map(hex => parseInt(hex, 16) / 256);
    const brightness = 0.299 * r + 0.597 * g + 0.114 * b;

    if (optional) {
      if (brightness >= 0.75) return `rgba(0,0,0, ${opacity})`;
      else if (brightness <= 0.25) return `rgba(255,255,255, ${opacity})`;
      else return null;
    } else {
      if (brightness >= 0.5) return `rgba(0,0,0, ${opacity})`;
      else return `rgba(255,255,255, ${opacity})`;
    }
  }

}
