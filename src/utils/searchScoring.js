/**
 * searchScoring.js
 * Implements the personalized ranking algorithm and exact/fuzzy matching weights.
 */

// Weight constants
const WEIGHTS = {
  EXACT_TITLE: 1.0,
  EXACT_ARTIST: 0.8,
  STARTS_WITH: 0.6,
  FUZZY_MATCH: 0.4,
  LYRICS_MATCH: 0.3,
  ALBUM_MATCH: 0.3,
  PERSONALIZATION_BOOST: 0.15
};

/**
 * Get play count for a song/artist from localStorage
 */
function getPlayCount(id) {
  try {
    const history = JSON.parse(localStorage.getItem('flowy_play_history') || '{}');
    return history[id] || 0;
  } catch {
    return 0;
  }
}

/**
 * Increment play count for personalization
 */
export function recordPlayHistory(item) {
  try {
    const history = JSON.parse(localStorage.getItem('flowy_play_history') || '{}');
    
    // Record both the specific song and the artist
    if (item.name) {
      history[item.name] = (history[item.name] || 0) + 1;
    }
    if (item.artist) {
      history[item.artist] = (history[item.artist] || 0) + 1;
    }
    
    localStorage.setItem('flowy_play_history', JSON.stringify(history));
  } catch (e) {
    console.error("Failed to record play history", e);
  }
}

/**
 * Calculate personalized score for a search result
 */
export function calculateScore(item, query, type, originalFuseScore = 1) {
  const normalizedQuery = query.toLowerCase().trim();
  const name = (item.name || item.title || '').toLowerCase();
  
  let score = 0;
  
  // Base match score
  if (name === normalizedQuery) {
    score += WEIGHTS.EXACT_TITLE;
  } else if (name.startsWith(normalizedQuery)) {
    score += WEIGHTS.STARTS_WITH;
  } else {
    // Fuse.js returns lower score for better matches (0 = perfect)
    // Invert it to make higher = better
    score += WEIGHTS.FUZZY_MATCH * (1 - originalFuseScore);
  }

  // Type specific base weights
  if (type === 'artist' && name === normalizedQuery) {
    score += WEIGHTS.EXACT_ARTIST;
  } else if (type === 'lyrics') {
    score += WEIGHTS.LYRICS_MATCH;
  } else if (type === 'album') {
    score += WEIGHTS.ALBUM_MATCH;
  }

  // Personalization Boost
  const playCount = getPlayCount(item.name || item.title) + getPlayCount(item.artist);
  if (playCount > 0) {
    // Logarithmic boost cap
    const boost = Math.min(Math.log10(playCount + 1) * WEIGHTS.PERSONALIZATION_BOOST, 0.4);
    score += boost;
  }

  return score;
}

/**
 * Select the Top Result across all categories
 */
export function getTopResult(songs, albums, artists, lyricsMatches, query) {
  let allCandidates = [];

  songs.forEach(s => allCandidates.push({ ...s, type: 'song', _score: calculateScore(s, query, 'song', s.score || 0) }));
  artists.forEach(a => allCandidates.push({ ...a, type: 'artist', _score: calculateScore(a, query, 'artist', a.score || 0) }));
  albums.forEach(a => allCandidates.push({ ...a, type: 'album', _score: calculateScore(a, query, 'album', a.score || 0) }));
  lyricsMatches.forEach(l => allCandidates.push({ ...l, type: 'lyrics', _score: calculateScore(l, query, 'lyrics', l.score || 0) }));

  if (allCandidates.length === 0) return null;

  // Sort by highest score
  allCandidates.sort((a, b) => b._score - a._score);
  
  return allCandidates[0];
}
