import * as vscode from 'vscode';
import { JenkinsJobProvider } from './tree-view';

export function createFilterView(context: vscode.ExtensionContext, jobProvider: JenkinsJobProvider) {
    const filterView = vscode.window.createWebviewPanel(
        'jenkinsFilter',
        'Filter Jenkins Jobs',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    filterView.webview.html = getFilterViewContent();

    filterView.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'filter':
                    jobProvider.filter(message.text);
                    return;
            }
        },
        undefined,
        context.subscriptions
    );

    return filterView;
}

function getFilterViewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Filter Jenkins Jobs</title>
        </head>
        <body>
            <input type="text" id="filterInput" placeholder="Search Jenkins jobs..." oninput="filterJobs()" style="width: 100%;">
            <script>
                const vscode = acquireVsCodeApi();
                function filterJobs() {
                    const text = document.getElementById('filterInput').value;
                    vscode.postMessage({ command: 'filter', text: text });
                }
            </script>
        </body>
        </html>
    `;
}
