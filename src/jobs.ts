import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { jenkins } from './jenkins';
import { openJobWebview } from './web-view';
import { JenkinsJobProvider, JenkinsJobTreeItem, createJenkinsJobTreeItem } from './tree-view';

export async function listJenkinsJobs(context: vscode.ExtensionContext): Promise<JenkinsJobTreeItem[]> {
    try {
        let jobFilePath = getJobListFilePath(context);
        let jobs: any[] | undefined;

        // Check if the job file exists and has jobs
        if (fs.existsSync(jobFilePath)) {
            try {
                const fileContent = fs.readFileSync(jobFilePath, 'utf-8');
                jobs = JSON.parse(fileContent);
                console.log('Loaded jobs from file:', jobs);
            } catch (err) {
                console.error('Error reading job file, fetching from Jenkins instead:', err);
            }
        }

        if (!jobs || Object.keys(jobs).length === 0) {
            console.log('Fetching Jenkins jobs...');
            const jobsResponse = await fetchJenkinsJobsFromAPI();
            console.log('Fetched Jenkins Jobs Response:', jobsResponse);

            jobs = jobsResponse;
            if (!jobs || Object.keys(jobs).length === 0) {
                throw new Error('Jobs data is undefined or empty');
            }

            saveJobsToFile(jobFilePath, jobs);
        }

        vscode.window.showInformationMessage('Loaded Jenkins Jobs');
        return buildTreeItems(jobs);
    } catch (err) {
        const errorMessage = (err as any).message || err;
        vscode.window.showErrorMessage(`Error fetching Jenkins jobs: ${errorMessage}`);
        console.error('Error fetching Jenkins jobs:', err);
        return [];
    }
}

export async function openJob(context: vscode.ExtensionContext, jobUrl: string) {
    try {
        // Extract job name from the URL
        const jobName = extractJobNameFromUrl(jobUrl);
        
        if (!jenkins) {
            throw new Error('Jenkins client is not initialized.');
        }

        console.log('Fetching Jenkins job details for:', jobName);
        const job = await jenkins.job.get(jobName);
        console.log(JSON.stringify(job, null, 2));

        let parameters = [];
        if (job.property) {
            for (let prop of job.property) {
                if (prop.parameterDefinitions) {
                    parameters = prop.parameterDefinitions;
                    break;
                }
            }
        }

        openJobWebview(context, jobName, parameters);

        if (parameters.length === 0) {
            vscode.window.showInformationMessage('No parameters found for this job.');
        }
    } catch (err) {
        const errorMessage = (err as any).message || err;
        vscode.window.showErrorMessage(`Error fetching Jenkins job details: ${errorMessage}`);
        console.error('Error fetching Jenkins job details:', err);
    }
}

export function extractJobNameFromUrl(jobUrl: string): string {
    const urlParts = jobUrl.split('/job/');
    if (urlParts.length > 1) {
        return urlParts.slice(1).join('/');
    }
    return jobUrl.split('/').filter(Boolean).pop() ?? 'unknown';
}

export async function fetchJenkinsJobsFromAPI() {
    if (!jenkins) {
        throw new Error('Jenkins client is not initialized.');
    }

    const jobsResponse = await jenkins.job.list({ tree: 'jobs[name,url,jobs[name,url]]' });
    console.log('Raw Jenkins jobs response:', jobsResponse);

    if (!jobsResponse) {
        throw new Error('Received undefined response from Jenkins API');
    }

    if (!Object.keys(jobsResponse)) {
        throw new Error('Jobs data is undefined or empty');
    }

    return jobsResponse;
}

export function saveJobsToFile(jobFilePath: string, jobs: any) {
    try {
        const data = JSON.stringify(jobs, null, 2);
        console.log('Saving jobs to file:', jobFilePath, data);
        fs.writeFileSync(jobFilePath, data, 'utf-8');
    } catch (err) {
        const errorMessage = (err as any).message || err;
        vscode.window.showErrorMessage(`Error saving jobs to file: ${errorMessage}`);
        console.error('Error saving jobs to file:', err);
    }
}

export function updateJobListView(context: vscode.ExtensionContext, jobs: any[]) {
    const jobItems = buildTreeItems(jobs);
    const jobProvider = new JenkinsJobProvider(jobItems);
    vscode.window.registerTreeDataProvider('jenkinsJobs', jobProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('jenkinsJobs.refresh', async () => {
            try {
                const jobFilePath = getJobListFilePath(context);
                const refreshedJobs = await fetchJenkinsJobsFromAPI();

                console.log('Refreshed Jenkins Jobs:', refreshedJobs);
                saveJobsToFile(jobFilePath, refreshedJobs);
                jobProvider.refresh(buildTreeItems(refreshedJobs));
            } catch (err) {
                const errorMessage = (err as any).message || err;
                vscode.window.showErrorMessage(`Error refreshing Jenkins jobs: ${errorMessage}`);
                console.error('Error refreshing Jenkins jobs:', err);
            }
        })
    );
}

export function buildTreeItems(jobs: any[]): JenkinsJobTreeItem[] {
    return jobs.map(job => {
        if (job.jobs && job.jobs.length > 0) {
            return createJenkinsJobTreeItem(
                job.name,
                job.url,
                buildTreeItems(job.jobs)
            );
        } else {
            return createJenkinsJobTreeItem(
                job.name,
                job.url
            );
        }
    });
}

export function getJobListFilePath(context: vscode.ExtensionContext): string {
    const defaultFilePath = path.join(context.globalStorageUri.fsPath, 'list_of_jobs.json');
    const config = vscode.workspace.getConfiguration('jenkins');
    const customJobFilePath = config.get<string>('jobListFilePath');

    return customJobFilePath || defaultFilePath;
}

export function getJobNameFromUrl(jobUrl: string): string {
    return jobUrl.split('/').filter(Boolean).pop() ?? 'unknown';
}

export function extractJobParameters(job: any): any[] {
    let parameters = [];
    if (job.property) {
        for (let prop of job.property) {
            if (prop.parameterDefinitions) {
                parameters = prop.parameterDefinitions;
                break;
            }
        }
    }
    return parameters;
}
