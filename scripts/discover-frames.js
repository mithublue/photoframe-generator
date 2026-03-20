import fs from 'fs';
import path from 'path';

const framesDir = path.join(process.cwd(), 'public', 'frames');
const manifestPath = path.join(framesDir, 'manifest.json');

try {
    if (!fs.existsSync(framesDir)) {
        console.log('Frames directory not found, creating one...');
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const files = fs.readdirSync(framesDir);
    const frames = files
        .filter(file => /\.(png|jpe?g|webp)$/i.test(file))
        .map(file => {
            // Use the filename (without extension) as a fallback label
            const name = path.parse(file).name
                .split(/[_-]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return {
                id: file,
                url: `/frames/${file}`,
                label: name
            };
        });

    fs.writeFileSync(manifestPath, JSON.stringify(frames, null, 2));
    console.log(`Successfully discovered ${frames.length} frames and updated manifest.json`);
} catch (error) {
    console.error('Error discovering frames:', error);
    process.exit(1);
}
