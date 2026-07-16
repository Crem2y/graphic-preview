export interface PreviewMetadata {
    type: "1bpp";
    width: number;
    height: number;
}

export interface PreviewArray {
    metadata: PreviewMetadata;
    name: string;
    values: number[];

    declarationStart: number;
    initializerStart: number;
    initializerEnd: number;
}