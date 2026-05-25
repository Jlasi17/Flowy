import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Index } from 'flexsearch';
import { doubleMetaphone } from 'double-metaphone';
import { groupsData } from '../data/musicRegistry';
import { getArtistProfileImage } from '../utils/singerColors';
import { getTopResult } from '../utils/searchScoring';

// Dynamically import lyrics index (vite handles this nicely)
// If it fails to load initially, it will be empty
let lyricsData = [];
try {
  import('../data/lyricsIndex.json').then((module) => {
    lyricsData = module.default || [];
  });
} catch (e) {
  console.error("Failed to load lyrics index", e);
}

// Build a flat searchable database for all groups
const buildSearchDatabases = () => {
  const songs = [];
  const albums = [];
  const artists = new Map();

  Object.entries(groupsData).forEach(([groupId, g]) => {
    const flatGroupAlbums = (g.albums || []).flatMap(block =>
      (block.albums || []).map(a => ({ ...a, year: block.year, member: g.title, groupId }))
    );

    flatGroupAlbums.forEach(album => {
      albums.push({ ...album, isSolo: false });
      const albumSongs = (g.songs || {})[album.id] || [];
      albumSongs.forEach((song, idx) => {
        songs.push({
          name: song.name,
          file: song.file,
          albumId: album.id,
          albumTitle: album.title,
          albumCover: album.cover,
          albumColor: album.color,
          artist: g.title,
          groupId,
          isSolo: false,
          index: idx,
          // Phonetic indexing
          phoneticTitle: doubleMetaphone(song.name).join(' '),
          phoneticArtist: doubleMetaphone(g.title).join(' ')
        });
      });
    });

    const soloAlbumsData = (g.soloAlbums || []);
    soloAlbumsData.forEach(memberBlock => {
      const member = memberBlock.member;
      if (!artists.has(member)) {
        artists.set(member, {
          name: member,
          groupId,
          albumCount: 0,
          covers: [],
          profileImage: getArtistProfileImage(member),
          phoneticName: doubleMetaphone(member).join(' ')
        });
      }
      memberBlock.albums.forEach(album => {
        albums.push({ ...album, member, isSolo: true, groupId });
        const art = artists.get(member);
        art.albumCount++;
        if (art.covers.length < 3) art.covers.push(album.cover);

        const albumSongs = (g.soloSongs || {})[album.id] || [];
        albumSongs.forEach((song, idx) => {
          songs.push({
            name: song.name,
            file: song.file,
            albumId: album.id,
            albumTitle: album.title,
            albumCover: album.cover,
            albumColor: album.color,
            artist: member,
            groupId,
            isSolo: true,
            index: idx,
            phoneticTitle: doubleMetaphone(song.name).join(' '),
            phoneticArtist: doubleMetaphone(member).join(' ')
          });
        });
      });
    });

    artists.set(g.title, {
      name: g.title,
      groupId,
      albumCount: flatGroupAlbums.length,
      covers: flatGroupAlbums.slice(0, 3).map(a => a.cover),
      profileImage: getArtistProfileImage(g.title) || g.heroImg,
      phoneticName: doubleMetaphone(g.title).join(' ')
    });
  });

  return { songs, albums, artists: Array.from(artists.values()) };
};

export function useAdvancedSearch(query) {
  const [results, setResults] = useState({ songs: [], albums: [], artists: [], lyrics: [], topResult: null });
  const [isSearching, setIsSearching] = useState(false);
  const [ghostText, setGhostText] = useState("");

  const { songs, albums, artists } = useMemo(() => buildSearchDatabases(), []);

  // Initialize Engines
  const engines = useMemo(() => {
    const fuseOptions = {
      includeScore: true,
      threshold: 0.4, // Tolerates typos
      keys: ['name', 'phoneticTitle', 'phoneticName', 'title', 'artist', 'phoneticArtist']
    };

    const flexSearchIndex = new Index({
      tokenize: 'forward',
      resolution: 9
    });

    // We do this inside a timeout to not block UI thread during load
    setTimeout(() => {
      lyricsData.forEach((item, idx) => {
        flexSearchIndex.add(idx, item.lyrics);
      });
    }, 100);

    return {
      songs: new Fuse(songs, { ...fuseOptions, keys: ['name', 'artist', 'phoneticTitle', 'phoneticArtist'] }),
      albums: new Fuse(albums, { ...fuseOptions, keys: ['title', 'member'] }),
      artists: new Fuse(artists, { ...fuseOptions, keys: ['name', 'phoneticName'] }),
      lyrics: flexSearchIndex
    };
  }, [songs, albums, artists]);

  useEffect(() => {
    if (!query) {
      setResults({ songs: [], albums: [], artists: [], lyrics: [], topResult: null });
      setGhostText("");
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(() => {
      const normalizedQuery = query.toLowerCase().trim();
      const phoneticQuery = doubleMetaphone(normalizedQuery).join(' ');

      // 1. Metadata Search via Fuse
      let songResults = engines.songs.search(normalizedQuery).map(r => ({ ...r.item, score: r.score }));
      let albumResults = engines.albums.search(normalizedQuery).map(r => ({ ...r.item, score: r.score }));
      let artistResults = engines.artists.search(normalizedQuery).map(r => ({ ...r.item, score: r.score }));

      if (phoneticQuery && phoneticQuery !== normalizedQuery) {
        const phSongs = engines.songs.search(phoneticQuery).map(r => ({ ...r.item, score: r.score + 0.1 }));
        const phArtists = engines.artists.search(phoneticQuery).map(r => ({ ...r.item, score: r.score + 0.1 }));
        
        const mergeResults = (arr1, arr2) => {
          const map = new Map();
          [...arr1, ...arr2].forEach(item => {
            const key = item.name || item.title;
            if (!map.has(key) || item.score < map.get(key).score) {
              map.set(key, item);
            }
          });
          return Array.from(map.values()).sort((a,b) => a.score - b.score);
        };
        songResults = mergeResults(songResults, phSongs);
        artistResults = mergeResults(artistResults, phArtists);
      }

      songResults = songResults.slice(0, 8);
      albumResults = albumResults.slice(0, 6);
      artistResults = artistResults.slice(0, 4);

      // 2. Lyrics Search via FlexSearch
      const lyricsIndices = engines.lyrics.search(normalizedQuery, 5);
      const lyricsMatches = lyricsIndices.map(idx => lyricsData[idx]).map(l => {
        // Find the actual song object in our db
        const songObj = songs.find(s => s.name === l.songId);
        return songObj ? { ...songObj, lyricMatch: true } : null;
      }).filter(Boolean);

      // 3. Scoring & Top Result
      const topResult = getTopResult(songResults, albumResults, artistResults, lyricsMatches, query);

      // Ghost Text prediction (Autocomplete)
      if (songResults.length > 0 && songResults[0].name.toLowerCase().startsWith(normalizedQuery)) {
        setGhostText(songResults[0].name.slice(normalizedQuery.length));
      } else if (artistResults.length > 0 && artistResults[0].name.toLowerCase().startsWith(normalizedQuery)) {
        setGhostText(artistResults[0].name.slice(normalizedQuery.length));
      } else {
        setGhostText("");
      }

      setResults({
        songs: songResults,
        albums: albumResults,
        artists: artistResults,
        lyrics: lyricsMatches,
        topResult
      });
      setIsSearching(false);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [query, engines, songs]);

  return { results, isSearching, ghostText };
}
