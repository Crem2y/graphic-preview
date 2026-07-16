export type PreviewLayout =
    | "horizontal"
    | "vertical";

export interface PreviewMetadata {
    type: "1bpp";
    width: number;
    height: number;
    layout: PreviewLayout;
}

export interface PreviewArray {
    metadata: PreviewMetadata;
    name: string;
    values: number[];

    declarationStart: number;
    initializerStart: number;
    initializerEnd: number;
}