import { PNG } from "pngjs";
import { PreviewLayout } from "./previewTypes";

export function render1bpp(
    values: number[],
    width: number,
    height: number,
    layout: PreviewLayout
): string {
    const png = new PNG({
        width,
        height
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const bit = layout === "horizontal"
                ? getHorizontalBit(values, width, x, y)
                : getVerticalBit(values, height, x, y);

            const color = bit === 0 ? 255 : 0;
            const outputIndex = (y * width + x) * 4;

            png.data[outputIndex + 0] = color;
            png.data[outputIndex + 1] = color;
            png.data[outputIndex + 2] = color;
            png.data[outputIndex + 3] = 255;
        }
    }

    return PNG.sync.write(png).toString("base64");
}

function getHorizontalBit(
    values: number[],
    width: number,
    x: number,
    y: number
): number {
    const bytesPerRow = Math.ceil(width / 8);

    const byteIndex =
        y * bytesPerRow + Math.floor(x / 8);

    const bitIndex = 7 - (x % 8);

    return ((values[byteIndex] ?? 0) >> bitIndex) & 1;
}

function getVerticalBit(
    values: number[],
    height: number,
    x: number,
    y: number
): number {
    const bytesPerColumn = Math.ceil(height / 8);

    const byteIndex =
        x * bytesPerColumn + Math.floor(y / 8);

    const bitIndex = 7 - (y % 8);

    return ((values[byteIndex] ?? 0) >> bitIndex) & 1;
}