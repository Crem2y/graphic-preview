const assert = require('node:assert/strict');
const { test } = require('node:test');
const { PNG } = require('pngjs');
const { render1bpp, renderRgb565 } = require('../out/previewRenderer');

for (const [name, render, valuesFor] of [
    ['1bpp', render1bpp, (w, h) => Array(Math.ceil(w / 8) * h).fill(0x55)],
    ['rgb565', renderRgb565, (w, h) => Array.from({ length: w * h * 2 }, (_, i) => i % 2 ? 0xf8 : 0)]
]) {
    test(`${name} scales by integer factors at size boundaries in either orientation`, () => {
        for (const [size, scale] of [[1, 4], [64, 4], [65, 3], [85, 3], [86, 2], [128, 2], [129, 1], [256, 1], [257, 1]]) {
            for (const [width, height] of [[size, 2], [2, size]]) {
                const png = PNG.sync.read(Buffer.from(render(valuesFor(width, height), width, height, 'horizontal'), 'base64'));
                assert.equal(png.width, width * scale, `${width}x${height}: width`);
                assert.equal(png.height, height * scale, `${width}x${height}: height`);
                for (let y = 0; y < png.height; y++) {
                    for (let x = 0; x < png.width; x++) {
                        const offset = (y * png.width + x) * 4;
                        const color = Math.floor(x / scale) % 2 ? 0 : 255;
                        const expected = name === 'rgb565' ? [255, 0, 0, 255] : [color, color, color, 255];
                        assert.deepEqual([...png.data.subarray(offset, offset + 4)], expected);
                    }
                }
            }
        }
    });
}
