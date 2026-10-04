const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../frontend/node_modules/sharp');

(async () => {
  const directory = path.resolve(__dirname, '../frontend/src/app');
  const source = fs.readFileSync(path.resolve(__dirname, '../frontend/public/brand/whistle-logo.png'));
  const { width, height } = await sharp(source).metadata();
  if (!width || width !== height) throw new Error('The supplied Whistle logo must have its original square proportions.');
  fs.writeFileSync(path.join(directory, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${source.toString('base64')}"/></svg>\n`);
  const sizes = [16, 32, 48, 64];
  const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((png, index) => {
    const at = 6 + index * 16;
    header[at] = sizes[index];
    header[at + 1] = sizes[index];
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  fs.writeFileSync(path.join(directory, 'favicon.ico'), Buffer.concat([header, ...images]));
  await sharp(source).resize(180, 180).png().toFile(path.join(directory, 'apple-icon.png'));
  console.log('Supplied Whistle logo exported for browser tabs and saved shortcuts.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
