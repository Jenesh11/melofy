const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const allFiles = getFiles('c:/Codes/website/melofy/apps/web/src');
const stats = allFiles.map((f) => {
  const content = fs.readFileSync(f, 'utf8');
  return {
    file: f.replace('c:\\Codes\\website\\melofy\\apps\\web\\src\\', ''),
    lines: content.split('\n').length,
  };
});

stats.sort((a, b) => b.lines - a.lines);
console.log(JSON.stringify(stats.slice(0, 15), null, 2));
