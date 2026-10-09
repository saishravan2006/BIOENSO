const fs = require('fs');
let c = fs.readFileSync('src/engine.ts', 'utf8');

c = c.replace('    score,', '    score: insufficientEvidence ? 0 : score,');
fs.writeFileSync('src/engine.ts', c);
