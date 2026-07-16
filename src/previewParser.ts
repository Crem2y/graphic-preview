import * as vscode from "vscode";
import {
    PreviewArray,
    PreviewMetadata
} from "./previewTypes";

export function findPreviewArray(
    document: vscode.TextDocument,
    hoverOffset: number
): PreviewArray | undefined {
    const source = document.getText();

    const arrayPattern =
        /\b([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)+=\s*\{/g;

    let match: RegExpExecArray | null;

    while ((match = arrayPattern.exec(source)) !== null) {
        const name = match[1];

        // 정규식이 찾은 배열 이름의 시작 위치
        const nameStart = match.index;

        // 현재 선언문이 있는 줄의 시작 위치
        const declarationStart =
            source.lastIndexOf("\n", nameStart) + 1;

        const initializerStart =
            match.index + match[0].lastIndexOf("{");

        const initializerEnd = findMatchingBrace(
            source,
            initializerStart
        );

        if (initializerEnd < 0) {
            continue;
        }

        // 배열 이름 또는 배열 데이터 위에서만 Hover 표시
        if (
            hoverOffset < nameStart ||
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
            name,
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
    const beforeDeclaration = source
        .slice(0, declarationStart)
        .trimEnd();

    let comment: string | undefined;

    if (beforeDeclaration.endsWith("*/")) {
        const commentStart = beforeDeclaration.lastIndexOf("/*");

        if (commentStart >= 0) {
            comment = beforeDeclaration.slice(commentStart);
        }
    } else {
        const lines = beforeDeclaration.split(/\r?\n/);
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