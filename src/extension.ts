import * as vscode from 'vscode';
import { initializeJenkins, jenkins } from './jenkins';
import { registerCommands, setJobView } from './commands';
import { JenkinsJobView } from './jenkins-job-view';
import { listJenkinsJobs } from './jobs';

export async function activate(context: vscode.ExtensionContext) {
    await initializeJenkins();

    if (!jenkins) {
        vscode.window.showErrorMessage('Failed to initialize Jenkins client. Please check your configuration.');
        return;
    }

    // Trigger the command to list Jenkins jobs on activation
    const jobItems = await listJenkinsJobs(context);
    const jobView = new JenkinsJobView(context, jobItems);
    setJobView(jobView);

    // Register all commands
    registerCommands(context);

    vscode.commands.executeCommand('listJenkinsJobs');
}

export function deactivate() {}
