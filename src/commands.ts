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

    context.subscriptions.push(listJobsCommand, openJobCommand, refreshJobsCommand, filterJobsCommand);
}

export function setJobView(view: JenkinsJobView) {
    jobView = view;
}
