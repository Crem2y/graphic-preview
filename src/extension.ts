// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PNG } from "pngjs";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bitmap-preview" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('bitmap-preview.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from bitmap-preview!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(
        vscode.languages.registerHoverProvider('c', {
            provideHover(document, position) {

                const text = document.getText();

                const offset = document.offsetAt(position);

                // 현재 위치 기준으로 가장 가까운 { 와 }
                const begin = text.lastIndexOf("{", offset);
                const end = text.indexOf("}", offset);

                if (begin < 0 || end < 0 || end <= begin)
                    return;

                const body = text.substring(begin + 1, end);

                // 숫자 추출
                const matches = body.match(/0x[0-9a-fA-F]+|\d+/g);
                if (!matches || matches.length < 64)
                    return;

                const data = matches
                    .slice(0, 64)
                    .map(v => parseInt(v, 0));

                //----------------------------------------
                // PNG 생성
                //----------------------------------------

                const png = new PNG({
                    width: 8,
                    height: 8,
                });

                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {

                        const value = data[y * 8 + x];

                        const c = value == 0 ? 255 : 0;

                        const idx = (y * 8 + x) * 4;

                        png.data[idx + 0] = c;
                        png.data[idx + 1] = c;
                        png.data[idx + 2] = c;
                        png.data[idx + 3] = 255;
                    }
                }

                const base64 = PNG.sync.write(png).toString("base64");

                const md = new vscode.MarkdownString();

                md.appendMarkdown("### Font preview\n\n");
                md.appendMarkdown(
                    `![](data:image/png;base64,${base64})`
                );

                return new vscode.Hover(md);
            }
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}