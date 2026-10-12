import fs from 'fs';
import path from 'path';

const publicFile = (name) => path.join(process.cwd(), 'public', name);

test('aba e manifesto usam a marca Modelos Pizza e o ícone da pizza', () => {
  const html = fs.readFileSync(publicFile('index.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(publicFile('manifest.json'), 'utf8'));
  expect(html).toContain('lang="pt-BR"');
  expect(html).toContain('type="image/svg+xml" href="%PUBLIC_URL%/pizza.svg"');
  expect(html).toContain('<title>Modelos Pizza · Gestão inteligente</title>');
  expect(html).not.toContain('React App');
  expect(manifest.short_name).toBe('Modelos Pizza');
  expect(manifest.theme_color).toBe('#e86419');
  manifest.icons.forEach((icon) => expect(fs.existsSync(publicFile(icon.src))).toBe(true));
});

test.each([192, 512])('ícone raster %s tem resolução correta e transparência', (size) => {
  const png = fs.readFileSync(publicFile(`logo${size}.png`));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(size);
  expect(png.readUInt32BE(20)).toBe(size);
  expect(png[25]).toBe(6); // RGB + canal alfa.
});

test('favicon contém imagens de pizza para abas de 16 e 32 pixels', () => {
  const ico = fs.readFileSync(publicFile('favicon.ico'));
  expect(ico.readUInt16LE(0)).toBe(0);
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(2);
  [16, 32].forEach((size, index) => {
    const entry = 6 + index * 16;
    expect(ico[entry]).toBe(size);
    expect(ico[entry + 1]).toBe(size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    expect(offset + length).toBeLessThanOrEqual(ico.length);
    const png = ico.subarray(offset, offset + length);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(size);
  });
});
