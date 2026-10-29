const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PNG } = require('pngjs');
const { findPreviewArray } = require('../out/previewParser');
const renderer = require('../out/previewRenderer');

test('RGB565 metadata accepts little-endian byte arrays', () => {
    const source = '// @preview {"type":"rgb565","width":1,"height":1,"layout":"horizontal"}\nconst uint8_t image[] = {0x00, 0xF8};';
    const preview = findPreviewArray({ getText: () => source }, source.indexOf('image'));
    assert.equal(preview?.metadata.type, 'rgb565');
    assert.deepEqual(preview.values, [0, 248]);
});

test('RGB565 restores little-endian colors and both layouts', () => {
    assert.equal(typeof renderer.renderRgb565, 'function');
    const words = [0xf800, 0x07e0, 0x001f, 0xffff, 0x0000, 0x8410];
    const expected = [[255,0,0], [0,255,0], [0,0,255], [255,255,255], [0,0,0], [132,130,132]];
    for (const layout of ['horizontal', 'vertical']) {
        const order = layout === 'horizontal' ? words : [words[0], words[3], words[1], words[4], words[2], words[5]];
        const bytes = order.flatMap(word => [word & 255, word >> 8]);
        const png = PNG.sync.read(Buffer.from(renderer.renderRgb565(bytes, 3, 2, layout), 'base64'));
        assert.equal(png.width, 12);
        assert.equal(png.height, 8);
        for (let y = 0; y < png.height; y++) {
            for (let x = 0; x < png.width; x++) {
                const offset = (y * png.width + x) * 4;
                assert.deepEqual([...png.data.subarray(offset, offset + 4)], [...expected[Math.floor(y / 4) * 3 + Math.floor(x / 4)], 255]);
            }
        }
    }
});
