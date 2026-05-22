const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filesToProcess = [
  { path: 'src/data/btsSongs.js', basePath: 'public/btssongs/', useAlbumId: true },
  { path: 'src/data/btsSoloSongs.js', basePath: 'public/btssongs/solos/', useAlbumId: false },
  { path: 'src/data/lesserafimSongs.js', basePath: 'public/lesongs/', useAlbumId: true },
  { path: 'src/data/txtSongs.js', basePath: 'public/txtsongs/', useAlbumId: true }
];

function getDuration(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`).toString().trim();
    const durationSeconds = parseFloat(output);
    if (isNaN(durationSeconds)) return null;
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  } catch (err) {
    console.error(`Error getting duration for ${filePath}: ${err.message}`);
    return null;
  }
}

for (const config of filesToProcess) {
  const fullPath = path.join(__dirname, config.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${config.path}, not found.`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let currentAlbumId = null;
  
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for album ID array start: "1": [ or 's1': [
    const albumMatch = line.match(/^\s*(?:"|')?([a-zA-Z0-9_-]+)(?:"|')?\s*:\s*\[/);
    if (albumMatch) {
      currentAlbumId = albumMatch[1];
      continue;
    }
    
    // Check for song object: { name: "...", file: "..." }
    const songMatch = line.match(/\{.*file:\s*(["'])(.+?)\1.*?\}/);
    if (songMatch && currentAlbumId) {
      const fileName = songMatch[2];
      
      // If duration already exists, skip
      if (line.includes('duration:')) {
        continue;
      }
      
      let audioPath;
      if (config.useAlbumId) {
        audioPath = path.join(__dirname, config.basePath, currentAlbumId, fileName);
      } else {
        audioPath = path.join(__dirname, config.basePath, fileName);
      }
      
      const duration = getDuration(audioPath);
      if (duration) {
        // Insert duration before the closing brace
        const replacement = line.replace(/\s*\}\s*,?$/, `, duration: "${duration}" }${line.endsWith(',') ? ',' : ''}`);
        lines[i] = replacement;
        modified = true;
        console.log(`Added duration ${duration} to ${fileName}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
    console.log(`Successfully updated ${config.path}`);
  } else {
    console.log(`No changes made to ${config.path}`);
  }
}
