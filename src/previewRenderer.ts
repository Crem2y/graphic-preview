import { PNG } from "pngjs";

export function render1bpp(
    values: number[],
    width: number,
    height: number
): string {
    const png = new PNG({
        width,
        height
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = y * width + x;
            const outputIndex = pixelIndex * 4;

            const color =
                values[pixelIndex] === 0
                    ? 255
                    : 0;

            png.data[outputIndex + 0] = color;
            png.data[outputIndex + 1] = color;
            png.data[outputIndex + 2] = color;
            png.data[outputIndex + 3] = 255;
        }
    }

    return PNG.sync.write(png).toString("base64");
}