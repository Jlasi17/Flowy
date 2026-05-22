/**
 * Singer color palette — pastel, accessible tones.
 * Each color is used for the active lyric glow + subtle inactive tint.
 */
export const SINGER_COLORS = {
  // Group members
  'RM': { primary: '#7ab8f5', glow: 'rgba(122, 184, 245, 0.5)' },   // soft sky-blue
  'Jin': { primary: '#f5a8c0', glow: 'rgba(245, 168, 192, 0.5)' },   // soft rose-pink
  'SUGA': { primary: '#d0d0d8', glow: 'rgba(208, 208, 216, 0.4)' },   // near-white silver (black → white)
  'j-hope': { primary: '#f5946a', glow: 'rgba(245, 148, 106, 0.5)' },   // soft coral-red
  'Jimin': { primary: '#f5d47a', glow: 'rgba(245, 212, 122, 0.5)' },   // warm gold
  'V': { primary: '#84d4a0', glow: 'rgba(132, 212, 160, 0.45)' },  // sage green
  'JungKook': { primary: '#b89fe8', glow: 'rgba(184, 159, 232, 0.5)' },   // soft lavender-purple

  // LE SSERAFIM members
  'CHAEWON': {
    primary: '#c9ccd6',
    glow: 'rgba(201, 204, 214, 0.5)'  // soft silver
  },

  'SAKURA': {
    primary: '#f5a8c0',
    glow: 'rgba(245, 168, 192, 0.5)'  // pastel pink
  },

  'YUNJIN': {
    primary: '#9cd6a4',
    glow: 'rgba(156, 214, 164, 0.5)'  // soft green
  },

  'KAZUHA': {
    primary: '#7ab8f5',
    glow: 'rgba(122, 184, 245, 0.5)'  // sky blue
  },

  'EUNCHAE': {
    primary: '#f28b82',
    glow: 'rgba(242, 139, 130, 0.5)'  // soft red
  },

  // TXT members
  'Soobin': { primary: '#58a6ff', glow: 'rgba(88, 166, 255, 0.5)' }, // Blue
  'Yeonjun': { primary: '#da3f31ff', glow: 'rgba(210, 107, 98, 0.5)' }, // Red
  'Beomgyu': { primary: '#f5a8c0', glow: 'rgba(245, 168, 192, 0.5)' }, // Pink
  'Taehyun': { primary: '#84d4a0', glow: 'rgba(132, 212, 160, 0.5)' }, // Green
  'HueningKai': { primary: '#f5d47a', glow: 'rgba(245, 212, 122, 0.5)' }, // Golden Yellow

  // Default fallback
  'default': { primary: '#ffffff', glow: 'rgba(255, 255, 255, 0.3)' },
};

export function getSingerColor(singerName) {
  if (!singerName) return SINGER_COLORS.default;
  return SINGER_COLORS[singerName] || SINGER_COLORS.default;
}

export function getArtistProfileImage(name) {
  if (!name) return null;
  // Use normalized casings if needed, mapping strictly to user request
  const lookup = name.toLowerCase();

  if (lookup === "rm") return "/soloartists/rm.jpg";
  if (lookup === "jin") return "/soloartists/jin.jpg";
  if (lookup === "agust d" || lookup === "suga") return "/soloartists/suga.jpg";
  if (lookup === "j-hope") return "/soloartists/jhope.jpg";
  if (lookup === "jimin") return "/soloartists/jimin.jpg";
  if (lookup === "v" || lookup === "taehyung") return "/soloartists/v.jpg";
  if (lookup === "jungkook") return "/soloartists/jungkook.jpg";

  // LE SSERAFIM
  if (lookup === "chaewon") return "/soloartists/CHAEWON.png";
  if (lookup === "sakura") return "/soloartists/SAKURA.png";
  if (lookup === "yunjin") return "/soloartists/YUNJIN.png";
  if (lookup === "kazuha") return "/soloartists/KAZUHA.png";
  if (lookup === "eunchae") return "/soloartists/EUNCHAE.png";

  // TXT
  if (lookup === "soobin") return "/soloartists/soobin.jpg";
  if (lookup === "yeonjun") return "/soloartists/yeonjun.jpg";
  if (lookup === "beomgyu") return "/soloartists/beomgyu.jpg";
  if (lookup === "taehyun") return "/soloartists/taehyun.jpg";
  if (lookup === "hueningkai" || lookup === "hyuka") return "/soloartists/hueningkai.jpg";

  if (lookup === "bts") return "/homeimage/btsopening.jpg";
  if (lookup === "txt") return "/homeimage/txtopening.jpg";
  if (lookup === "enhypen") return "/homeimage/enopening.jpg";
  if (lookup === "seventeen") return "/homeimage/seventeenopening.jpg";
  if (lookup === "newjeans") return "/homeimage/newjeansopening.jpg";
  if (lookup === "le sserafim") return "/homeimage/lesserafimopening.jpg";
  if (lookup === "illit") return "/homeimage/illitopening.jpg";
  if (lookup === "katseye") return "/homeimage/katseyeopening.jpg";

  return null;
}

export function getHeartColor(color) {
  if (!color) return '#b91d3cff';
  const hex = color.replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 40) return '#ffffff';
  }
  return color;
}
