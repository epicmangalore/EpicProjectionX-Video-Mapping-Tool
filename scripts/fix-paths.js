const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../out');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            let content = fs.readFileSync(filePath, 'utf8');

            // Replace absolute paths starting with /_next/ with relative ones
            // We need to be careful not to break everything. 
            // In most cases, replacing href="/_next/" with href="_next/" works.
            // But we also need to handle src="/_next/" and other attributes.

            // Simpler approach: replace all "/_next/" with "_next/" 
            // and "/favicon.ico" with "favicon.ico" etc.

            content = content.replace(/(href|src)="\/_next\//g, '$1="_next/');
            content = content.replace(/(href|src)="\/favicon\.ico"/g, '$1="favicon.ico"');
            content = content.replace(/(href|src)="\/logo\.png"/g, '$1="logo.png"');
            content = content.replace(/(href|src)="\/editor-logo\.png"/g, '$1="editor-logo.png"');
            content = content.replace(/(href|src)="\/manifest\.json"/g, '$1="manifest.json"');

            // Handle font preloads
            content = content.replace(/href="\/_next\//g, 'href="_next/');

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed paths in: ${filePath}`);
        }
    });
}

console.log('Fixing absolute paths for Electron...');
processDirectory(outDir);
console.log('Path fixing complete!');
