import btsAlbums from "./btsAlbums";
import btsSongs from "./btsSongs";
import btsSoloAlbums from "./btsSoloAlbums";
import btsSoloSongs from "./btsSoloSongs";
import lesserafimAlbums from "./lesserafimAlbums";
import lesserafimSongs from "./lesserafimSongs";
import txtAlbums from "./txtAlbums";
import txtSongs from "./txtSongs";

export const groupsData = {
  bts: {
    title: "BTS",
    heroImg: "/bts/btshome.jpg",
    hasSolos: true,
    soloists: ["RM", "JIN", "AGUST D", "j-hope", "JIMIN", "Taehyung", "Jungkook"],
    albums: btsAlbums,
    soloAlbums: btsSoloAlbums,
    songs: btsSongs,
    soloSongs: btsSoloSongs,
    basePath: "/btssongs/",
    soloBasePath: "/btssongs/solos/"
  },
  lesserafim: {
    title: "LE SSERAFIM",
    heroImg: "/homeimage/lesserafimopening.jpg",
    hasSolos: false,
    soloists: ["CHAEWON", "SAKURA", "YUNJIN", "KAZUHA", "EUNCHAE"],
    albums: lesserafimAlbums,
    soloAlbums: [],
    songs: lesserafimSongs,
    soloSongs: {},
    basePath: "/lesongs/",
    soloBasePath: ""
  },
  txt: {
    title: "TXT",
    heroImg: "/homeimage/txtopening.jpg",
    hasSolos: false,
    soloists: ["Soobin", "Yeonjun", "Beomgyu", "Taehyun", "HueningKai"],
    albums: txtAlbums,
    songs: txtSongs,
    basePath: "/txtsongs/"
  },
  enhypen: {
    title: "ENHYPEN",
    heroImg: "/homeimage/enopening.jpg",
    hasSolos: false,
    soloists: [],
    albums: [],
    songs: {},
    basePath: "/en-songs/"
  },
  seventeen: {
    title: "SEVENTEEN",
    heroImg: "/homeimage/seventeenopening.jpg",
    hasSolos: false,
    soloists: [],
    albums: [],
    songs: {},
    basePath: "/svt-songs/"
  },
  katseye: {
    title: "KATSEYE",
    heroImg: "/homeimage/katseyeopening.jpg",
    hasSolos: false,
    soloists: [],
    albums: [],
    songs: {},
    basePath: "/katseye-songs/"
  },
  illit: {
    title: "ILLIT",
    heroImg: "/homeimage/illitopening.jpg",
    hasSolos: false,
    soloists: [],
    albums: [],
    songs: {},
    basePath: "/illit-songs/"
  },
  newjeans: {
    title: "NEWJEANS",
    heroImg: "/homeimage/newjeansopening.jpg",
    hasSolos: false,
    soloists: [],
    albums: [],
    songs: {},
    basePath: "/nj-songs/"
  }
};

export default groupsData;
