import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lyricsDir = path.resolve(__dirname, '../public/lyrics');
const outputFilePath = path.resolve(__dirname, '../src/data/lyricsIndex.json');

function compileLyrics() {
  const lyricsIndex = [];

  if (!fs.existsSync(lyricsDir)) {
    console.warn(`Lyrics directory not found at ${lyricsDir}`);
    return;
  }

  const files = fs.readdirSync(lyricsDir);

  for (const file of files) {
    if (!file.endsWith('.lrc')) continue;

    // The song name is the filename without .lrc
    const songName = path.basename(file, '.lrc');
    const filePath = path.join(lyricsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse the .lrc file
    const lines = content.split('\n');
    const textLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract text outside of brackets [mm:ss.xx]
      // Format is usually [mm:ss.xx]Text or [singer]Text
      const textMatch = trimmed.replace(/\[.*?\]/g, '').trim();
      
      if (textMatch && textMatch !== 'Instrumental' && textMatch !== 'End' && textMatch !== '♪ ♪ ♪') {
        textLines.push(textMatch);
      }
    }

    // Join lyrics into a single string for full-text search indexing
    const fullText = textLines.join(' ');
    
    // Only add if there are actual lyrics
    if (fullText.length > 0) {
      lyricsIndex.push({
        songId: songName, // Can be matched with song.name in frontend
        lyrics: fullText
      });
    }
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(lyricsIndex, null, 2));
  console.log(`Compiled ${lyricsIndex.length} lyrics files into src/data/lyricsIndex.json`);
}

compileLyrics();
