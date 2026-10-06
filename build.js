// Embeds index.js into xyops.json as the inline Plugin script.
// Run after every change to index.js: npm run build

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'xyops.json');
const pdf = JSON.parse(fs.readFileSync(file, 'utf8'));
pdf.items[0].data.script = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
fs.writeFileSync(file, JSON.stringify(pdf, null, '\t') + '\n');
