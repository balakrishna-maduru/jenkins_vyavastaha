import * as vscode from "vscode";
import * as path from "path";

export class JenkinsJobProvider implements vscode.TreeDataProvider<JenkinsJobTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<JenkinsJobTreeItem | undefined> = new vscode.EventEmitter<JenkinsJobTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<JenkinsJobTreeItem | undefined> = this._onDidChangeTreeData.event;
    private allJobItems: JenkinsJobTreeItem[];

    constructor(private jobItems: JenkinsJobTreeItem[]) {
        this.allJobItems = jobItems;
    }

    getTreeItem(element: JenkinsJobTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: JenkinsJobTreeItem): Thenable<JenkinsJobTreeItem[]> {
        if (element) {
            return Promise.resolve(element.children || []);
        } else {
            return Promise.resolve(this.jobItems);
        }
    }

    refresh(jobItems: JenkinsJobTreeItem[]): void {
        this.jobItems = jobItems;
        this.allJobItems = jobItems;
        this._onDidChangeTreeData.fire(undefined);
    }

    filter(regex: RegExp): void {
        this.jobItems = this.filterItems(this.allJobItems, regex);
        this._onDidChangeTreeData.fire(undefined);
    }

    private filterItems(items: JenkinsJobTreeItem[], regex: RegExp): JenkinsJobTreeItem[] {
        return items
            .map(item => {
                if (item.children) {
                    const filteredChildren = this.filterItems(item.children, regex);
                    if (filteredChildren.length > 0) {
                        return new JenkinsJobTreeItem(item.label, item.collapsibleState, item.url, item.command, filteredChildren, true);
                    }
                }
                if (regex.test(item.label)) {
                    return item;
                }
                return null;
            })
            .filter(item => item !== null) as JenkinsJobTreeItem[];
    }
}

export class JenkinsJobTreeItem extends vscode.TreeItem {
    public children: JenkinsJobTreeItem[] | undefined;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly url: string,
        public readonly command?: vscode.Command,
        children?: JenkinsJobTreeItem[],
        isFolder: boolean = false
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - ${this.url}`;
        this.description = this.url;
        this.contextValue = 'jenkinsJob';
        this.command = command;
        this.children = children;

        // Set the custom icon
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'resources', 'images', 'light', isFolder ? 'violet-container.svg' : 'violet-job-arrow.svg'),
            dark: path.join(__filename, '..', '..', 'resources', 'images', 'dark', isFolder ? 'violet-container.svg' : 'violet-job-arrow.svg')
        };
    }
}

// Helper function to create JenkinsJobTreeItem instances
export function createJenkinsJobTreeItem(label: string, url: string, children?: JenkinsJobTreeItem[]): JenkinsJobTreeItem {
    return new JenkinsJobTreeItem(
        label,
        children && children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        url,
        {
            command: 'openJob',
            title: 'Open Jenkins Job',
            arguments: [url]
        },
        children,
        children && children.length > 0 // isFolder is true if there are children
    );
}
