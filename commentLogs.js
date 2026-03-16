const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    if (path.basename(filePath) === 'server.js') return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    let i = 0;
    while ((i = content.indexOf('console.log', i)) !== -1) {
        const lineStart = content.lastIndexOf('\n', i) + 1;
        const linePrefix = content.substring(lineStart, i);
        // check if it's already commented
        if (linePrefix.includes('//') || linePrefix.includes('/*')) { i += 11; continue; }

        let openParen = content.indexOf('(', i);
        if (openParen === -1 || content.substring(i + 11, openParen).trim() !== '') { i += 11; continue; }

        let depth = 1; let p = openParen + 1; let inString = false; let stringChar = ''; let escape = false;
        while (p < content.length && depth > 0) {
            const c = content[p];
            if (escape) { escape = false; }
            else if (c === '\\') { escape = true; }
            else if (inString) { if (c === stringChar) inString = false; }
            else {
                if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; }
                else if (c === '(') { depth++; }
                else if (c === ')') { depth--; }
            }
            p++;
        }

        if (depth === 0) {
            let endP = p; let capturedSemicolon = false;
            let tempEndP = endP;
            while (tempEndP < content.length && /\s/.test(content[tempEndP])) tempEndP++;
            if (content[tempEndP] === ';') { endP = tempEndP + 1; capturedSemicolon = true; }
            const fullStatement = content.substring(i, endP);
            const replacement = '/* ' + fullStatement.replace(/\*\//g, '* /') + ' */ void 0' + (capturedSemicolon ? ';' : '');
            content = content.substring(0, i) + replacement + content.substring(endP);
            i += replacement.length;
        } else { i += 11; }
    }

    if (content !== original) { fs.writeFileSync(filePath, content, 'utf8'); console.log(`Updated ${filePath}`); }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) { walkDir(fullPath); }
        else if (fullPath.endsWith('.js') || fullPath.endsWith('.cjs')) { processFile(fullPath); }
    }
}

walkDir(path.join(__dirname, 'src'));
walkDir(path.join(__dirname, 'config'));
walkDir(path.join(__dirname, 'utils'));
walkDir(path.join(__dirname, 'controllers'));
walkDir(path.join(__dirname, 'routes'));
walkDir(path.join(__dirname, 'middlewares'));
