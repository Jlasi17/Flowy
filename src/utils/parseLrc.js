/**
 * Parses LRC files with the extended format:
 * [MM:SS.mm][SingerName] Lyric text
 *
 * Returns an array of: { time: number (seconds), singer: string, text: string }
 */
export function parseLrc(lrcString) {
  if (!lrcString) return [];

  const lines = lrcString.split('\n');
  const parsed = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Match: [MM:SS.mm][SingerName] text   OR   [MM:SS.mm] text (no singer)
    const match = trimmed.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](?:\[([^\]]+)\])?\s*(.*)$/);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centiseconds = parseInt(match[3].padEnd(3, '0'), 10); // normalize to ms
    const time = minutes * 60 + seconds + centiseconds / 1000;
    const singer = match[4] ? match[4].trim() : null;
    const text = match[5]?.trim() || '';

    // Include line if there is text OR a singer tag (for markers like [Instrumental])
    if (text || singer) {
      parsed.push({ time, singer, text });
    }
  }

  // Sort by time just in case
  return parsed.sort((a, b) => a.time - b.time);
}
