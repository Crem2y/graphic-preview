import { PNG } from "pngjs";
import { PreviewLayout } from "./previewTypes";

const PREVIEW_SCALE = 4;

export function render1bpp(
    values: number[],
    width: number,
    height: number,
    layout: PreviewLayout
): string {
    const outputWidth = width * PREVIEW_SCALE;
    const outputHeight = height * PREVIEW_SCALE;

    const png = new PNG({
        width: outputWidth,
        height: outputHeight
    });

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const bit = layout === "horizontal"
                ? getHorizontalBit(values, width, x, y)
                : getVerticalBit(values, height, x, y);

            const color = bit === 0 ? 255 : 0;

            drawScaledPixel(
                png,
                x,
                y,
                PREVIEW_SCALE,
                color
            );
        }
    }

    return PNG.sync.write(png).toString("base64");
}

function drawScaledPixel(
    png: PNG,
    sourceX: number,
    sourceY: number,
    scale: number,
    color: number
): void {
    const startX = sourceX * scale;
    const startY = sourceY * scale;

    for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
            const outputX = startX + dx;
            const outputY = startY + dy;

            const outputIndex =
                (outputY * png.width + outputX) * 4;

            png.data[outputIndex + 0] = color;
            png.data[outputIndex + 1] = color;
            png.data[outputIndex + 2] = color;
            png.data[outputIndex + 3] = 255;
        }
    }
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