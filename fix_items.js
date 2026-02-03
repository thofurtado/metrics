import fs from 'fs';
const path = 'c:/Users/Thomás Furtado/Documents/GitHub/metrics/src/pages/app/treatments/treatment-items.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');
    const anchor = '</DialogContent>';
    const lastIndex = content.lastIndexOf(anchor);

    if (lastIndex === -1) {
        console.error('Anchor not found');
        process.exit(1);
    }

    // Keep everything up to the end of </DialogContent>
    const newContent = content.substring(0, lastIndex + anchor.length) +
        '\n    </ErrorBoundary>\n  )\n}\n';

    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Fixed file.');
} catch (e) {
    console.error(e);
    process.exit(1);
}
