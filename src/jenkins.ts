import * as vscode from 'vscode';
const JenkinsLibrary = require('jenkins');

export let jenkins: any;

export async function initializeJenkins() {
    try {
        const config = vscode.workspace.getConfiguration('jenkins');

        const baseUrl = config.get<string>('url');
        const username = config.get<string>('username');
        let password = config.get<string>('password');
        const crumbIssuer = config.get<boolean>('crumbIssuer');
        const rejectUnauthorized = config.get<boolean>('rejectUnauthorized');

        console.log('Jenkins Configuration:', { baseUrl, username, crumbIssuer, rejectUnauthorized });

        if (!baseUrl || !username) {
            vscode.window.showErrorMessage('Jenkins URL and username must be configured.');
            return;
        }

        if (!password) {
            password = await vscode.window.showInputBox({
                prompt: 'Enter your Jenkins password or API token',
                password: true,
                ignoreFocusOut: true
            });

            if (!password) {
                vscode.window.showErrorMessage('Jenkins password is required.');
                return;
            }
        }

        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const fullUrl = `${baseUrl.replace(/\/$/, '')}`;

        console.log('Full Jenkins URL:', fullUrl);

        jenkins = new JenkinsLibrary({
            baseUrl: fullUrl,
            promisify: true,
            crumbIssuer: crumbIssuer,
            headers: {
                Authorization: `Basic ${auth}`
            },
            rejectUnauthorized: rejectUnauthorized
        });

        console.log('Jenkins client initialized:', jenkins);
    } catch (error) {
        const errorMessage = (error as any).message || error;
        vscode.window.showErrorMessage(`Failed to initialize Jenkins client: ${errorMessage}`);
        console.error('Failed to initialize Jenkins client:', error);
    }
}
