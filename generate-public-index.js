// Generate slim public index (no content, just metadata)
const fs = require('fs');
const path = require('path');

const fullIndex = JSON.parse(fs.readFileSync(path.join(__dirname, 'kb-index.json'), 'utf-8'));

const publicIndex = {
  generated: new Date().toISOString(),
  count: fullIndex.count,
  categories: {},
  entries: fullIndex.entries.map(entry => ({
    id: entry.id,
    title: entry.title,
    category: entry.category,
    icon: entry.icon,
    summary: entry.summary.substring(0, 200),
    keywords: entry.keywords.slice(0, 5),
    type: entry.path.split('/')[0], // troubleshooting, techniques, patterns
  })),
};

// Build category stats
fullIndex.entries.forEach(entry => {
  if (!publicIndex.categories[entry.category]) {
    publicIndex.categories[entry.category] = { count: 0, icon: entry.icon };
  }
  publicIndex.categories[entry.category].count++;
});

fs.writeFileSync(
  path.join(__dirname, 'kb-index-public.json'),
  JSON.stringify(publicIndex)
);

console.log(`Generated public index: ${publicIndex.count} entries, ${Object.keys(publicIndex.categories).length} categories`);
console.log(`Full index: ${(fs.statSync(path.join(__dirname, 'kb-index.json')).size / 1024).toFixed(0)}KB`);
console.log(`Public index: ${(fs.statSync(path.join(__dirname, 'kb-index-public.json')).size / 1024).toFixed(0)}KB`);
