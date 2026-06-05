import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import the registry
import('./src/data/musicRegistry.js').then((module) => {
    const data = module.groupsData || module.default;
    const destDir = path.join(__dirname, 'public', 'data');
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'musicRegistry.json');
    fs.writeFileSync(destPath, JSON.stringify(data, null, 2));
    console.log(`Successfully migrated data to ${destPath}`);
}).catch(err => {
    console.error("Error migrating data:", err);
});
