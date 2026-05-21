import { useState, useEffect, useContext } from 'react';
import { AudioContext } from '../AudioPlayerProvider';
import { parseLrc } from '../utils/parseLrc';

/**
 * Fetches and parses the .lrc file for the active song,
 * and tracks the currently active lyric index against currentTime.
 *
 * LRC files must live at: /lyrics/{SongName}.lrc
 */
export function useLyrics() {
  const { activeSong, albumId, currentTime } = useContext(AudioContext);

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLyrics, setHasLyrics] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fetch and parse the LRC whenever the active song changes
  useEffect(() => {
    if (!activeSong) {
      setLines([]);
      setHasLyrics(false);
      return;
    }

    // Strip track number prefixes and problematic characters like colons
    const rawName = activeSong.name || '';
    const nameForFile = rawName
      .replace(/^\d{1,2}\.\s+/, '') // "07. SWIM" -> "SWIM", but "2.0" remains "2.0"
      .replace(/:/g, '')            // strip colons
      .replace(/\s+/g, ' ')      // collapse whitespace
      .trim();

    // Most aggressive variant: alphanumeric only
    const cleanAlpha = nameForFile.replace(/[^a-zA-Z0-9]/g, '');

    setLoading(true);
    setLines([]);
    setHasLyrics(false);

    const attemptFetch = (trackName) => {
      const url = `/lyrics/${encodeURIComponent(trackName)}.lrc`;
      return fetch(url).then(res => {
        if (!res.ok) throw new Error('No lyrics');
        return res.text();
      });
    };

    // Try variations to account for case differences
    const variations = [
      nameForFile,
      nameForFile.toUpperCase(),
      nameForFile.toLowerCase(),
      cleanAlpha,
      cleanAlpha.toUpperCase(),
      cleanAlpha.toLowerCase()
    ];

    // Ampersand fallbacks: "Blood Sweat & Tears" -> "Blood Sweat and Tears", "Blood Sweat Tears"
    if (nameForFile.includes('&')) {
      const withAnd = nameForFile.replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
      const withSpace = nameForFile.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
      variations.push(withAnd, withAnd.toUpperCase(), withAnd.toLowerCase());
      variations.push(withSpace, withSpace.toUpperCase(), withSpace.toLowerCase());
    }

    // Sequentially try variations and prioritize the first one that actually has lyric lines
    const fetchWithFallbacks = async (variants) => {
      for (const variant of variants) {
        try {
          const text = await attemptFetch(variant);
          const parsed = parseLrc(text);
          if (parsed && parsed.length > 0) {
            return { lines: parsed, hasLyrics: true };
          }
          // If parsed length is 0, it may be a catch-all HTML page; keep looking.
        } catch (e) {
          continue;
        }
      }
      throw new Error('All variations failed');
    };

    fetchWithFallbacks(Array.from(new Set(variations)))
      .then(result => {
        setLines(result.lines);
        setHasLyrics(result.hasLyrics);
      })
      .catch(() => {
        setHasLyrics(false);
        setLines([]);
      })
      .finally(() => setLoading(false));
  }, [activeSong?.name, albumId]);

  // Find active line index on every currentTime tick
  useEffect(() => {
    if (!lines.length) {
      setActiveIndex(-1);
      return;
    }
    // Binary-search style: last line whose time <= currentTime
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) idx = i;
      else break;
    }
    setActiveIndex(idx);
  }, [currentTime, lines]);

  return { lines, activeIndex, loading, hasLyrics };
}
