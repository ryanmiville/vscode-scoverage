import * as vscode from 'vscode';
import { Class, Package, parseReport, Report } from './scoverage';

type Node = Package | Class;

export class PackageProvider implements vscode.TreeDataProvider<Node> {
	private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | void> = new vscode.EventEmitter<Node | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Node | undefined | void> = this._onDidChangeTreeData.event;
	private report: Report | undefined;
	constructor() {
	}

	refresh(r: Report): void {
		this.report = r;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
		let item: vscode.TreeItem;
		if (element.type === 'package') {
			item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.Collapsed);
		} else {
			item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
			item.resourceUri = vscode.Uri.file(element.methods[0]?.statements[0]?.source);
			item.command = { command: 'vscode.open', title: "Open File", arguments: [item.resourceUri], };
		}
		item.description = `${element.statementRate}%`;
		return item;
	}

	// private uri: vscode.Uri = vscode.Uri.file('/Users/ryanmiville/dev/fluxus/target/scala-2.13/scoverage-report/scoverage.xml');

	getChildren(element?: Node): vscode.ProviderResult<Node[]> {
		if (!this.report) {
			console.log('report was undefined');
			return [];
			// return parseReport(this.uri)
			// 	.then(r => { this.report = r; })
			// 	.then(() => this.getChildren(element));
		}
		if (!element) {
			console.log('element was undefined');
			console.log(`report was ${this.report}`);
			return Promise.resolve(this.report?.packages);
		}
		if (element?.type === 'package') {
			console.log('element was a package');
			const classes = element.classes.map(c => {
				c.name = c.name.replace(`${element.name}.`, '');
				return c;
			});
			return Promise.resolve(classes);
		}
		return [];
	}

}