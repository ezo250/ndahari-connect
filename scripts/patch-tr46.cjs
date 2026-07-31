const fs = require('fs');
const f = 'node_modules/tr46/index.js';
if (fs.existsSync(f)) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.split('require("punycode/")').join('require("punycode")');
  fs.writeFileSync(f, c);
  console.log('Patched tr46/index.js successfully');
}
