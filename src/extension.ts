import * as vscode from 'vscode';
import { initializeJenkins, jenkins } from './jenkins';
import { listJenkinsJobs, openJob } from './jobs'; // Ensure 'openJob' is imported correctly

export async function activate(context: vscode.ExtensionContext) {
    await initializeJenkins();

    if (!jenkins) {
        vscode.window.showErrorMessage('Failed to initialize Jenkins client. Please check your configuration.');
        return;
    }

    // Register command to list Jenkins jobs
    const listJobsCommand = vscode.commands.registerCommand('listJenkinsJobs', () => listJenkinsJobs(context));
    const openJobCommand = vscode.commands.registerCommand('openJob', (jobUrl: string) => openJob(context, jobUrl)); // Ensure 'openJob' command is registered correctly
    context.subscriptions.push(listJobsCommand, openJobCommand);

    // Trigger the command to list Jenkins jobs on activation
    listJenkinsJobs(context);
}

export function deactivate() {}
