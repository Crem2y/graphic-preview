const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PNG } = require('pngjs');
const { findPreviewArray } = require('../out/previewParser');
const { render1bpp } = require('../out/previewRenderer');

function preview(packing) {
    const metadata = { type: '1bpp', width: 3, height: 2, layout: 'horizontal' };
    if (packing !== undefined) metadata.packing = packing;
    const source = `// @preview ${JSON.stringify(metadata)}\nconst unsigned char image[] = {0,1,0,1,0,1};`;
    return findPreviewArray({ getText: () => source }, source.indexOf('image'));
}

test('packing defaults to packed and accepts explicit modes', () => {
    assert.equal(preview().metadata.packing, 'packed');
    assert.equal(preview('packed').metadata.packing, 'packed');
    assert.equal(preview('unpacked').metadata.packing, 'unpacked');
    assert.equal(preview('invalid'), undefined);
    assert.equal(preview(null), undefined);
});

function pixels(values, width, height, layout, packing) {
    const png = PNG.sync.read(Buffer.from(render1bpp(values, width, height, layout, packing), 'base64'));
    return Array.from({ length: width * height }, (_, i) => {
        const x = (i % width) * 4;
        const y = Math.floor(i / width) * 4;
        return png.data[(y * png.width + x) * 4] === 0 ? 1 : 0;
    });
}

test('unpacked horizontal and vertical data produce the same pixels', () => {
    const expected = [0, 1, 0, 1, 0, 1];
    assert.deepEqual(pixels(expected, 3, 2, 'horizontal', 'unpacked'), expected);
    assert.deepEqual(pixels([0, 1, 1, 0, 0, 1], 3, 2, 'vertical', 'unpacked'), expected);
});

test('packed default retains byte padding and MSB-first order', () => {
    const expected = [0, 1, 0, 1, 0, 1];
    assert.deepEqual(pixels([0x40, 0xa0], 3, 2, 'horizontal'), expected);
    assert.deepEqual(pixels([0x40, 0x80, 0x40], 3, 2, 'vertical', 'packed'), expected);
});
