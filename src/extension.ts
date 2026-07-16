import * as vscode from "vscode";

import { findPreviewArray } from "./previewParser";
import { render1bpp } from "./previewRenderer";

export function activate(
    context: vscode.ExtensionContext
) {
    const provider =
        vscode.languages.registerHoverProvider(
            ["c", "cpp"],
            {
                provideHover(document, position) {
                    const hoverOffset =
                        document.offsetAt(position);

                    const preview = findPreviewArray(
                        document,
                        hoverOffset
                    );

                    if (!preview) {
                        return;
                    }

                    const {
                        metadata,
                        name,
                        values
                    } = preview;

                    const requiredLength =
                        metadata.width * metadata.height;

                    if (values.length < requiredLength) {
                        const md =
                            new vscode.MarkdownString();

                        md.appendMarkdown(
                            `### ${name}\n\n`
                        );

                        md.appendMarkdown(
                            `Not enough data: ` +
                            `${values.length}/` +
                            `${requiredLength}`
                        );

                        return new vscode.Hover(md);
                    }

                    const base64 = render1bpp(
                        values,
                        metadata.width,
                        metadata.height
                    );

                    const md =
                        new vscode.MarkdownString();

                    md.appendMarkdown(
                        `### ${name}\n\n`
                    );

                    md.appendMarkdown(
                        `${metadata.width} x ` +
                        `${metadata.height} · ` +
                        `${metadata.type}\n\n`
                    );

                    md.appendMarkdown(
                        `![](data:image/png;base64,${base64})`
                    );

                    return new vscode.Hover(md);
                }
            }
        );

    context.subscriptions.push(provider);
}

export function deactivate() {}