import * as vscode from 'vscode';
import { listJenkinsJobs, openJob, fetchJenkinsJobsFromAPI, saveJobsToFile, updateJobListView, getJobListFilePath, buildTreeItems } from './jobs';
import { jenkins } from './jenkins';
import { JenkinsJobView } from './jenkins-job-view';

let jobView: JenkinsJobView;

export function registerCommands(context: vscode.ExtensionContext) {
    const listJobsCommand = vscode.commands.registerCommand('listJenkinsJobs', async () => {
        const jobItems = await listJenkinsJobs(context);
        jobView.refresh(jobItems);
    });

    const openJobCommand = vscode.commands.registerCommand('openJob', (jobUrl: string) => openJob(context, jobUrl));

    const refreshJobsCommand = vscode.commands.registerCommand('jenkinsJobs.refresh', async () => {
        try {
            const jobFilePath = getJobListFilePath(context);
            const refreshedJobs = await fetchJenkinsJobsFromAPI();
            console.log('Refreshed Jenkins Jobs:', refreshedJobs);
            saveJobsToFile(jobFilePath, refreshedJobs);
            const jobItems = buildTreeItems(refreshedJobs);
            jobView.refresh(jobItems);
        } catch (err) {
            const errorMessage = (err as any).message || err;
            vscode.window.showErrorMessage(`Error refreshing Jenkins jobs: ${errorMessage}`);
            console.error('Error refreshing Jenkins jobs:', err);
        }
    });

    const filterJobsCommand = vscode.commands.registerCommand('jenkinsJobs.filter', () => {
        jobView.showFilterInputBox();
    });

    const configureJenkinsCommand = vscode.commands.registerCommand('jenkinsJobs.configure', async () => {
        await configureJenkinsSettings();
    });

    context.subscriptions.push(listJobsCommand, openJobCommand, refreshJobsCommand, filterJobsCommand, configureJenkinsCommand);
}

export function setJobView(view: JenkinsJobView) {
    jobView = view;
}

async function configureJenkinsSettings() {
    const config = vscode.workspace.getConfiguration('jenkins');

    const url = await vscode.window.showInputBox({
        prompt: 'Enter Jenkins URL',
        value: config.get('url') || 'http://localhost:8080'
    });

    if (!url) {
        vscode.window.showErrorMessage('Jenkins URL is required.');
        return;
    }

    const username = await vscode.window.showInputBox({
        prompt: 'Enter Jenkins Username',
        value: config.get('username') || ''
    });

    const password = await vscode.window.showInputBox({
        prompt: 'Enter Jenkins Password or API Token',
        value: config.get('password') || '',
        password: true
    });

    const crumbIssuer = await vscode.window.showQuickPick(['true', 'false'], {
        placeHolder: 'Use Crumb Issuer?',
        canPickMany: false,
        ignoreFocusOut: true
    });

    const rejectUnauthorized = await vscode.window.showQuickPick(['true', 'false'], {
        placeHolder: 'Reject Unauthorized SSL Certificates?',
        canPickMany: false,
        ignoreFocusOut: true
    });

    await config.update('url', url, vscode.ConfigurationTarget.Global);
    await config.update('username', username, vscode.ConfigurationTarget.Global);
    await config.update('password', password, vscode.ConfigurationTarget.Global);
    await config.update('crumbIssuer', crumbIssuer === 'true', vscode.ConfigurationTarget.Global);
    await config.update('rejectUnauthorized', rejectUnauthorized === 'true', vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage('Jenkins settings have been updated.');
}
