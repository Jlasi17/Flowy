const fs = require('fs');
let content = fs.readFileSync('src/data/btsAlbums.js', 'utf8');

// We need to insert albums into the correct years.
// Let's parse out the array. Since it's a JS file exporting a variable, we can require it, modify it, then stringify it.
// Wait, it's ES module (export default btsAlbums). We can just use string replacement or regex, but it's risky.
// Let's just rewrite the whole file, it's only 250 lines.
