import * as vscode from 'vscode';

export function createSearchView(context: vscode.ExtensionContext, jobProvider: any) {
    const panel = vscode.window.createWebviewPanel(
        'searchView',
        'Search Jenkins Jobs',
        { viewColumn: vscode.ViewColumn.One, preserveFocus: true },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case 'search':
                jobProvider.filter(message.text);
                break;
        }
    }, undefined, context.subscriptions);
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Search Jenkins Jobs</title>
    </head>
    <body>
        <input type="text" id="searchBox" placeholder="Search Jenkins jobs..." oninput="search()" />
        <script>
            const vscode = acquireVsCodeApi();
            function search() {
                const text = document.getElementById('searchBox').value;
                vscode.postMessage({
                    command: 'search',
                    text: text
                });
            }
        </script>
    </body>
    </html>`;
}
