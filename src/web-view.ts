import * as vscode from "vscode";
import * as path from "path";
import { jenkins } from "./jenkins";

let outputChannels: { [jobName: string]: vscode.OutputChannel } = {};
let currentPanel: vscode.WebviewPanel | undefined;

export function openJobWebview(context: vscode.ExtensionContext, jobName: string | undefined, parameters: any[]) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If we already have a panel, show it in the target column
    if (currentPanel) {
        currentPanel.reveal(column);
        // Update the content of the existing panel
        currentPanel.webview.html = getWebviewContent(jobName, parameters, getCssUri(context, currentPanel));
    } else {
        // Otherwise, create a new panel
        currentPanel = vscode.window.createWebviewPanel(
            'jenkinsJob',
            `Jenkins Job: ${jobName || 'Unknown'}`, // Fallback for undefined jobName
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        // Set the initial HTML content
        currentPanel.webview.html = getWebviewContent(jobName, parameters, getCssUri(context, currentPanel));

        // Handle messages from the webview
        currentPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'runJob':
                        try {
                            const outputChannel = getOutputChannel(jobName);
                            outputChannel.appendLine(`Starting job ${jobName}...`);

                            // Start the job and log streaming
                            startJobWithLogStream(jobName, message.parameters, outputChannel);

                            // Show the output channel for the latest triggered job
                            outputChannel.show(true);

                            // Close the panel after job run
                            currentPanel?.dispose();
                            currentPanel = undefined;
                        } catch (err) {
                            vscode.window.showErrorMessage(`Error starting job ${jobName}: ${err}`);
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        // Reset currentPanel when it's closed
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        });
    }
}

function getCssUri(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): vscode.Uri {
    const cssPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'));
    return panel.webview.asWebviewUri(cssPathOnDisk);
}

async function startJobWithLogStream(jobName: string | undefined, parameters: any[], outputChannel: vscode.OutputChannel) {
    try {
        let queueId: number;
        if (Object.keys(parameters).length > 0) {
            queueId = await jenkins.job.build({
                name: jobName,
                parameters: parameters
            });
        } else {
            queueId = await jenkins.job.build(jobName);
        }

        if (!queueId) {
            throw new Error(`Failed to queue job ${jobName}`);
        }

        outputChannel.appendLine(`Job ${jobName} queued successfully. Queue ID: ${queueId}`);

        // Poll the queue item to get the build number
        const buildNumber = await getBuildNumberFromQueue(queueId);

        outputChannel.appendLine(`Job ${jobName} started successfully. Build number: ${buildNumber}`);

        // Start log streaming
        const logStream = jenkins.build.logStream(jobName, buildNumber);
        logStream.on("data", (text: string) => {
            outputChannel.append(text); // Append log data to the output channel
        });
        logStream.on("end", () => {
            outputChannel.appendLine(`Job ${jobName} log stream ended.`);
        });
        logStream.on("error", (error: Error) => {
            outputChannel.appendLine(`Error in log stream for job ${jobName}: ${error.message}`);
        });
    } catch (err) {
        outputChannel.appendLine(`Error starting job ${jobName}: ${err}`);
        vscode.window.showErrorMessage(`Error starting job ${jobName}: ${err}`);
    }
}

async function getBuildNumberFromQueue(queueId: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const queueItem = await jenkins.queue.item(queueId);

                if (queueItem.executable) {
                    clearInterval(interval);
                    resolve(queueItem.executable.number);
                } else if (queueItem.cancelled) {
                    clearInterval(interval);
                    reject(new Error(`Job was cancelled before it started.`));
                }
            } catch (err) {
                clearInterval(interval);
                reject(err);
            }
        }, 5000); // Poll every 5 seconds
    });
}

function getOutputChannel(jobName: string | undefined): vscode.OutputChannel {
    if (!jobName) {
        throw new Error("Job name is undefined.");
    }
    if (!outputChannels[jobName]) {
        outputChannels[jobName] = vscode.window.createOutputChannel(`Jenkins Job: ${jobName}`);
    }
    return outputChannels[jobName];
}

function getWebviewContent(jobName: string | undefined, parameters: any[], cssUri: vscode.Uri) {
    let paramInputs = '';

    if (parameters.length > 0) {
        paramInputs = parameters.map(param => {
            let inputElement = '';

            switch (param._class) {
                case 'hudson.model.BooleanParameterDefinition':
                    inputElement = `<input type="checkbox" id="${param.name}" name="${param.name}" ${param.defaultParameterValue && param.defaultParameterValue.value === 'true' ? 'checked' : ''}>`;
                    break;
                case 'hudson.model.StringParameterDefinition':
                case 'hudson.model.PasswordParameterDefinition':
                case 'hudson.model.FileParameterDefinition':
                case 'hudson.model.TextParameterDefinition':
                case 'hudson.model.ChoiceParameterDefinition':
                    if (param.defaultParameterValue && param.defaultParameterValue.value !== undefined) {
                        inputElement = `<input type="text" id="${param.name}" name="${param.name}" value="${param.defaultParameterValue.value}">`;
                    } else {
                        inputElement = `<input type="text" id="${param.name}" name="${param.name}" value="">`;
                    }
                    break;
                default:
                    inputElement = `<input type="text" id="${param.name}" name="${param.name}" value="${param.defaultParameterValue ? param.defaultParameterValue.value : ''}">`;
                    break;
            }

            return `
                <tr>
                    <td><label for="${param.name}">${param.name}</label></td>
                    <td>${inputElement}</td>
                </tr>`;
        }).join('');
    } else {
        paramInputs = `<tr><td colspan="2">No parameters found for this job.</td></tr>`;
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${jobName}</title>
        <link href="${cssUri}" rel="stylesheet">
    </head>
    <body>
        <h1>${jobName}</h1>
        <form id="jobForm">
            <table>
                <thead>
                    <tr>
                        <th>Parameter Name</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${paramInputs}
                </tbody>
            </table>
            <button type="button" onclick="runJob()">Run Job</button>
        </form>
        <script>
            function runJob() {
                const vscode = acquireVsCodeApi();
                const form = document.getElementById('jobForm');
                const formData = new FormData(form);
                const parameters = {};
                formData.forEach((value, key) => { parameters[key] = value });
                vscode.postMessage({
                    command: 'runJob',
                    parameters: parameters
                });
            }
        </script>
    </body>
    </html>`;
}
