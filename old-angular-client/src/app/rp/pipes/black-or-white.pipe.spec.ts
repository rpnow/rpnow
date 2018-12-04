import { BlackOrWhitePipe } from './black-or-white.pipe';

const black = (opacity = 1) => `rgba(0,0,0, ${opacity})`;
const white = (opacity = 1) => `rgba(255,255,255, ${opacity})`;

describe('BlackOrWhitePipe', () => {

  const pipe = new BlackOrWhitePipe;

  it('default opacity', () => {
    expect(pipe.transform('#000000')).toBe(white());
    expect(pipe.transform('#555555')).toBe(white());
    expect(pipe.transform('#cccccc')).toBe(black());
    expect(pipe.transform('#ffffff')).toBe(black());
  });

  it('opacity', () => {
    expect(pipe.transform('#000000', 0.5)).toBe(white(0.5));
    expect(pipe.transform('#555555', 0.3)).toBe(white(0.3));
    expect(pipe.transform('#cccccc', 0.1)).toBe(black(0.1));
    expect(pipe.transform('#ffffff', 0.9)).toBe(black(0.9));
  });

  it('provides null when grey is needed', () => {
    expect(pipe.transform('#000000', 1, true)).toBe(white(1));
    expect(pipe.transform('#808080', 1, true)).toBe(null);
    expect(pipe.transform('#ffffff', 1, true)).toBe(black(1));
  });

});

