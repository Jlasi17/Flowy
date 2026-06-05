const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, 'public/data/musicRegistry.json');
const lyricsDir = path.join(__dirname, 'public/lyrics');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const lyricsFiles = new Set(fs.readdirSync(lyricsDir));
let updatedCount = 0;

for (const key of Object.keys(registry)) {
  const group = registry[key];
  if (group.songs) {
    for (const albumId of Object.keys(group.songs)) {
      for (const song of group.songs[albumId]) {
        if (song.file && !song.lyricsFile) {
          // Guess the lyrics file name
          const baseName = song.file.replace('.mp3', '').replace('.wav', '');
          const lrcName = `${baseName}.lrc`;
          const lrcName2 = `${song.name}.lrc`;
          
          if (lyricsFiles.has(lrcName)) {
            song.lyricsFile = `/lyrics/${lrcName}`;
            updatedCount++;
          } else if (lyricsFiles.has(lrcName2)) {
            song.lyricsFile = `/lyrics/${lrcName2}`;
            updatedCount++;
          }
        }
      }
    }
  }
}

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`Updated ${updatedCount} songs with lyricsFile!`);
