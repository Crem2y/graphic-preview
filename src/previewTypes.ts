export type PreviewLayout =
    | "horizontal"
    | "vertical";

export type PreviewPacking = "packed" | "unpacked";

export interface PreviewMetadata {
    type: "1bpp" | "rgb565";
    width: number;
    height: number;
    layout: PreviewLayout;
    packing: PreviewPacking;
}

export interface PreviewArray {
    metadata: PreviewMetadata;
    name: string;
    values: number[];

    declarationStart: number;
    initializerStart: number;
    initializerEnd: number;
}
