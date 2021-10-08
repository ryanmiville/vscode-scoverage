/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as cp from 'child_process';
import { Uri, window, Disposable } from 'vscode';
import { QuickPickItem } from 'vscode';
import { workspace } from 'vscode';

class FileItem implements QuickPickItem {

	label: string;

	constructor(public base: Uri, public uri: Uri) {
		this.label = path.relative(base.fsPath, uri.fsPath);
	}
}

function searchForFiles(): FileItem[] {
	const fileName = 'scoverage.xml';
	let files: FileItem[] = [];

	const cwds = workspace.workspaceFolders ? workspace.workspaceFolders.map(f => f.uri.fsPath) : [process.cwd()];
	const q = process.platform === 'win32' ? '"' : '\'';
	try {
		cwds.forEach(cwd => {
			const cmd = `rg --files --glob-case-insensitive --no-ignore -g ${q}*${fileName}*${q}`;
			const stdout = cp.execSync(cmd, { cwd }).toString();
			files = files.concat(
				stdout
					.split('\n')
					.slice(0, -1) // remove empty new line
					.map(relative => new FileItem(Uri.file(cwd), Uri.file(path.join(cwd, relative))))
			);
		});
	} finally {
		return files;
	}
}

export async function pickFile(): Promise<Uri | undefined> {
	const files = searchForFiles();
	if (files.length === 1) {
		return Promise.resolve(files[0].uri);
	}
	if (files.length === 0) {
		window.showInformationMessage(`No scoverage files found. Run scoverage from the command line and try again.`);
		return Promise.resolve(undefined);
	}
	const result = await window.showQuickPick(files, {
		placeHolder: 'pick a scoverage file',
	});
	return result?.uri;
}