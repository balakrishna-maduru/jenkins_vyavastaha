import * as vscode from "vscode";
import * as path from "path";
import { JenkinsJobProvider, JenkinsJobTreeItem, createJenkinsJobTreeItem } from './tree-view';

export class JenkinsJobView {
    private jobProvider: JenkinsJobProvider;
    private treeView: vscode.TreeView<JenkinsJobTreeItem>;

    constructor(private context: vscode.ExtensionContext, jobItems: JenkinsJobTreeItem[]) {
        this.jobProvider = new JenkinsJobProvider(jobItems);
        this.treeView = vscode.window.createTreeView('jenkinsJobs', { treeDataProvider: this.jobProvider });
    }

    public showFilterInputBox() {
        const inputBox = vscode.window.createInputBox();
        inputBox.placeholder = "Filter Jenkins jobs...";
        inputBox.onDidChangeValue((value) => {
            try {
                const regex = new RegExp(value, 'i');
                this.jobProvider.filter(regex);
            } catch (e) {
                vscode.window.showErrorMessage(`Invalid regular expression: ${(e as Error).message}`);
            }
        });
        inputBox.onDidAccept(() => {
            inputBox.hide();
        });
        inputBox.show();
    }

    refresh(jobItems: JenkinsJobTreeItem[]) {
        this.jobProvider.refresh(jobItems);
    }

    getJobProvider() {
        return this.jobProvider;
    }
}
