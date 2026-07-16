import * as vscode from 'vscode';
import { PNG } from "pngjs";

interface PreviewMetadata {
    type: "1bpp";
    width: number;
    height: number;
}

interface PreviewArray {
    metadata: PreviewMetadata;
    name: string;
    values: number[];
    declarationStart: number;
    initializerStart: number;
    initializerEnd: number;
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
        vscode.languages.registerHoverProvider(["c", "cpp"], {
            provideHover(document, position) {
                const offset = document.offsetAt(position);
                const preview = findPreviewArray(document, offset);

                if (!preview) {
                    return;
                }

                const expectedLength =
                    preview.metadata.width * preview.metadata.height;

                if (preview.values.length < expectedLength) {
                    const md = new vscode.MarkdownString();

                    md.appendMarkdown("### Graphic Preview\n\n");
                    md.appendMarkdown(
                        `Preview error: Not enough elements ` +
                        `${preview.values.length}/${expectedLength}`
                    );

                    return new vscode.Hover(md);
                }

                const base64 = render1bpp(
                    preview.values,
                    preview.metadata.width,
                    preview.metadata.height
                );

                const md = new vscode.MarkdownString();

                md.appendMarkdown(`### ${preview.name}\n\n`);
                md.appendMarkdown(
                    `${preview.metadata.width} x ` +
                    `${preview.metadata.height} · ` +
                    `${preview.metadata.type}\n\n`
                );
                md.appendMarkdown(
                    `![](data:image/png;base64,${base64})`
                );

                return new vscode.Hover(md);
            }
        })
    );
}

function findPreviewArray(
    document: vscode.TextDocument,
    hoverOffset: number
): PreviewArray | undefined {
    const source = document.getText();

    /*
     * 배열 선언을 먼저 찾습니다.
     *
     * 지원 예:
     * const uint8_t image[] = {
     * static const uint16_t logo[256] = {
     */
    const arrayPattern =
        /\b([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)+=\s*\{/g;

    let match: RegExpExecArray | null;

    while ((match = arrayPattern.exec(source)) !== null) {
        const arrayName = match[1];

        const declarationStart = match.index;
        const initializerStart =
            match.index + match[0].lastIndexOf("{");

        const initializerEnd = findMatchingBrace(
            source,
            initializerStart
        );

        if (initializerEnd < 0) {
            continue;
        }

        /*
         * 배열 이름부터 초기화 블록 끝까지만 Hover 대상으로 둡니다.
         */
        if (
            hoverOffset < declarationStart ||
            hoverOffset > initializerEnd
        ) {
            continue;
        }

        const metadata = findPreviewMetadata(
            source,
            declarationStart
        );

        if (!metadata) {
            return;
        }

        const initializerBody = source.slice(
            initializerStart + 1,
            initializerEnd
        );

        return {
            metadata,
            name: arrayName,
            values: parseArrayValues(initializerBody),
            declarationStart,
            initializerStart,
            initializerEnd
        };
    }

    return;
}

function findPreviewMetadata(
    source: string,
    declarationStart: number
): PreviewMetadata | undefined {
    const beforeDeclaration = source.slice(0, declarationStart);

    /*
     * 선언부 앞의 공백을 제거합니다.
     * 주석 종료 지점과 선언 사이의 개행 및 들여쓰기를 허용합니다.
     */
    const trimmedEnd = beforeDeclaration.trimEnd();

    let comment: string | undefined;

    /*
     * Doxygen 및 일반 블록 주석:
     *
     * /**
     *  * @preview {...}
     *  *\/
     *
     * /* @preview {...} *\/
     */
    if (trimmedEnd.endsWith("*/")) {
        const commentStart = trimmedEnd.lastIndexOf("/*");

        if (commentStart >= 0) {
            comment = trimmedEnd.slice(commentStart);
        }
    } else {
        /*
         * 연속된 // 주석도 지원합니다.
         *
         * // 설명
         * // @preview {...}
         */
        const lines = trimmedEnd.split(/\r?\n/);
        const commentLines: string[] = [];

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();

            if (!line.startsWith("//")) {
                break;
            }

            commentLines.unshift(line);
        }

        if (commentLines.length > 0) {
            comment = commentLines.join("\n");
        }
    }

    if (!comment) {
        return;
    }

    return parsePreviewMetadataFromComment(comment);
}

function parsePreviewMetadataFromComment(
    comment: string
): PreviewMetadata | undefined {
    /*
     * 지원:
     *
     * // @preview {...}
     * * @preview {...}
     * @preview {...}
     *
     * JSON은 현재 한 줄 안에 있어야 합니다.
     */
    const match = comment.match(
        /(?:^|\r?\n)\s*(?:\/\/\s*|\*\s*)?@preview\s+(\{[^\r\n]*\})/
    );

    if (!match) {
        return;
    }

    return parseMetadata(match[1]);
}

function parseMetadata(
    text: string
): PreviewMetadata | undefined {
    let raw: unknown;

    try {
        raw = JSON.parse(text);
    } catch {
        return;
    }

    if (
        typeof raw !== "object" ||
        raw === null
    ) {
        return;
    }

    const value = raw as Record<string, unknown>;

    if (value.type !== "1bpp") {
        return;
    }

    if (
    !Number.isInteger(value.width) ||
        !Number.isInteger(value.height)
    ) {
        return;
    }

    const width = value.width as number;
    const height = value.height as number;

    if (width <= 0 || height <= 0) {
        return;
    }

    // image size limit
    if (width * height > 1024 * 1024) {
        return;
    }

    return {
        type: "1bpp",
        width,
        height
    };
}

function findMatchingBrace(
    source: string,
    openOffset: number
): number {
    let depth = 0;

    for (let i = openOffset; i < source.length; i++) {
        if (source[i] === "{") {
            depth++;
        } else if (source[i] === "}") {
            depth--;

            if (depth === 0) {
                return i;
            }
        }
    }

    return -1;
}

function parseArrayValues(source: string): number[] {
    /*
     * remove comments
     */
    const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

    const tokens = withoutComments.match(
        /0[xX][0-9a-fA-F]+|0[bB][01]+|\b\d+\b/g
    );

    if (!tokens) {
        return [];
    }

    return tokens.map(parseIntegerLiteral);
}

function parseIntegerLiteral(text: string): number {
    if (/^0[xX]/.test(text)) {
        return Number.parseInt(text.slice(2), 16);
    }

    if (/^0[bB]/.test(text)) {
        return Number.parseInt(text.slice(2), 2);
    }

    return Number.parseInt(text, 10);
}

function render1bpp(
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
            const sourceIndex = y * width + x;
            const outputIndex = sourceIndex * 4;

            /*
             * 0        -> white
             * not 0    -> black
             */
            const color = values[sourceIndex] === 0
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

export function deactivate() {}