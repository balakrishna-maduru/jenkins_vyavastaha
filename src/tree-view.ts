import * as vscode from 'vscode';

export class JenkinsJobProvider implements vscode.TreeDataProvider<JenkinsJobTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JenkinsJobTreeItem | undefined | null> = new vscode.EventEmitter<JenkinsJobTreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<JenkinsJobTreeItem | undefined | null> = this._onDidChangeTreeData.event;

    constructor(private jobItems: JenkinsJobTreeItem[]) {}

    getTreeItem(element: JenkinsJobTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: JenkinsJobTreeItem): Thenable<JenkinsJobTreeItem[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this.jobItems);
        }
    }

    refresh(jobItems?: JenkinsJobTreeItem[]): void {
        if (jobItems) {
            this.jobItems = jobItems;
        }
        this._onDidChangeTreeData.fire(null);
    }
}

export class JenkinsJobTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly url: string,
        public readonly children: JenkinsJobTreeItem[] = []
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.url}`;
        this.description = this.url;
        this.contextValue = 'jenkinsJob';
    }
}

export function createJenkinsJobTreeItem(
    label: string, 
    url: string, 
    children: JenkinsJobTreeItem[] = []
): JenkinsJobTreeItem {
    const collapsibleState = children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    return new JenkinsJobTreeItem(label, collapsibleState, url, children);
}
