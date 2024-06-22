import * as vscode from "vscode";
import * as path from "path";
import { jenkins } from "./jenkins";

// Maintain a mapping of jobName to OutputChannel for each job
let outputChannels: { [jobName: string]: vscode.OutputChannel } = {};

/**
 * Opens a webview panel to interact with a Jenkins job.
 * @param context The extension context.
 * @param jobName The name of the Jenkins job.
 * @param parameters Array of job parameters.
 */
export function openJobWebview(
    context: vscode.ExtensionContext,
    jobName: string | undefined,
    parameters: any[]
) {
    const panel = vscode.window.createWebviewPanel(
        'jenkinsJob',
        `Jenkins Job: ${jobName || 'Unknown'}`, // Fallback for undefined jobName
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    const cssPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'media', 'style.css'));
    const cssUri = panel.webview.asWebviewUri(cssPathOnDisk);

    // Set the webview HTML with the dynamic CSS and HTML content
    panel.webview.html = getWebviewContent(jobName, parameters, cssUri);

    // Retrieve or create an OutputChannel for this specific job
    const outputChannel = getOutputChannel(jobName);
    outputChannel.show(true); // Show the output channel panel

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'runJob':
                    try {
                        outputChannel.appendLine(`Starting job ${jobName}...`);
                        await startJobWithLogStream(jobName, message.parameters, outputChannel);
                    } catch (err) {
                        vscode.window.showErrorMessage(`Error starting job ${jobName}: ${err}`);
                    }
                    return;
            }
        },
        undefined,
        context.subscriptions
    );
}

/**
 * Starts a Jenkins job with given parameters and streams logs to an OutputChannel.
 * @param jobName The name of the Jenkins job.
 * @param parameters Array of job parameters.
 * @param outputChannel The VS Code OutputChannel for logging.
 */
async function startJobWithLogStream(
    jobName: string | undefined,
    parameters: any[],
    outputChannel: vscode.OutputChannel
) {
    try {
        let queueId: number;

        // Build the job with parameters if available
        if (parameters.length > 0) {
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

/**
 * Polls the Jenkins queue to retrieve the build number for a queued job.
 * @param queueId The queue ID of the job.
 * @returns Promise<number> The build number.
 */
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

/**
 * Retrieves an OutputChannel for a specific Jenkins job, creating one if it doesn't exist.
 * @param jobName The name of the Jenkins job.
 * @returns vscode.OutputChannel The OutputChannel instance.
 */
function getOutputChannel(jobName: string | undefined): vscode.OutputChannel {
    if (!jobName) {
        throw new Error("Job name is undefined.");
    }
    if (!outputChannels[jobName]) {
        outputChannels[jobName] = vscode.window.createOutputChannel(`Jenkins Job: ${jobName}`);
    }
    return outputChannels[jobName];
}

/**
 * Generates the HTML content for the Jenkins job webview.
 * @param jobName The name of the Jenkins job.
 * @param parameters Array of job parameters.
 * @param cssUri The URI of the CSS file for styling.
 * @returns string The HTML content.
 */
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
