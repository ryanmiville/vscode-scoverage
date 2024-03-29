import * as vscode from 'vscode';

import { parseReport, Report, Statement } from './scoverage';
import { pickFile } from './quickOpen';
import { PackageProvider } from './scoveragePackages';

let coverageStatusBarItem: vscode.StatusBarItem;

let report: Report | undefined;

let fileUri: vscode.Uri | undefined;

let packageProvider: PackageProvider;
export function activate(context: vscode.ExtensionContext) {
	packageProvider = new PackageProvider();
	vscode.window.registerTreeDataProvider('scoveragePackages', packageProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('scoverage.toggleCoverage', () => {
			toggleCoverage();
		}),
		vscode.commands.registerCommand('scoverage.clearData', () => {
			clearCoverage();
		}),
		vscode.commands.registerCommand('scoverage.refreshFile', () => {
			refreshCoverageFile();
		})
	);
	coverageStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	context.subscriptions.push(coverageStatusBarItem);

	addOnChangeActiveTextEditorListeners(context);
}

interface DecOpts {
	start: number;
	end: number;
}

interface CoverageData {
	uncoveredOptions: DecOpts[];
	coveredOptions: DecOpts[];
}

// map of file path -> statement coverage ranges
let coverageData: { [key: string]: CoverageData } = {};

let isCoverageApplied = false;


/**
 * Clear the coverage on all files
 */
function clearCoverage() {
	report = undefined;
	fileUri = undefined;
	coverageData = {};
	disposeDecorators();
	packageProvider.refresh(report);
	coverageStatusBarItem.hide();
	isCoverageApplied = false;
}

let decorators: {
	coveredHighlight: vscode.TextEditorDecorationType;
	uncoveredHighlight: vscode.TextEditorDecorationType;
};

let decoratorConfig: {
	[key: string]: any;
	coveredHighlightColor: vscode.ThemeColor;
	uncoveredHighlightColor: vscode.ThemeColor;
	coveredBorderColor: vscode.ThemeColor;
	uncoveredBorderColor: vscode.ThemeColor;
};

function setDecorators() {
	decoratorConfig = {
		coveredHighlightColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
		coveredBorderColor: new vscode.ThemeColor('diffEditor.insertedTextBorder'),
		uncoveredHighlightColor: new vscode.ThemeColor('diffEditor.removedTextBackground'),
		uncoveredBorderColor: new vscode.ThemeColor('diffEditor.removedTextBorder'),
	};

	const cov = {
		overviewRulerColor: 'green',
		backgroundColor: decoratorConfig.coveredHighlightColor,
		borderColor: decoratorConfig.coveredBorderColor
	};
	const uncov = {
		overviewRulerColor: 'red',
		backgroundColor: decoratorConfig.uncoveredHighlightColor,
		borderColor: decoratorConfig.uncoveredBorderColor
	};
	decorators = {
		coveredHighlight: vscode.window.createTextEditorDecorationType(cov),
		uncoveredHighlight: vscode.window.createTextEditorDecorationType(uncov),
	};
}

async function refreshCoverageFile() {
	report = undefined;
	toggleOff();
	toggleOn();
}

export async function toggleCoverage() {
	if (isCoverageApplied) {
		toggleOff();
	} else {
		toggleOn();
	}
}

function toggleOff() {
	disposeDecorators();
	isCoverageApplied = false;
}

function disposeDecorators() {
	if (decorators) {
		decorators.coveredHighlight.dispose();
		decorators.uncoveredHighlight.dispose();
	}
}


const supportedVersions: string[] = ["1.0"];

async function toggleOn() {
	if (!report) {
		await loadCoverageData();
		if (!report) {
			return;
		}
	}
	displayCoverageData();
}

async function loadCoverageData() {
	if (!fileUri) {
		fileUri = await pickFile();
		if (!fileUri) {
			return;
		}
	}
	coverageData = {};
	try {
		report = await parseReport(fileUri);
		packageProvider.refresh(report);
		if (!supportedVersions.includes(report.version)) {
			vscode.window.showInformationMessage(`Scoverage version ${report.version} is not supported. Supported versions are ${supportedVersions}`);
			return;
		}
		updateStatusBarItem(report.statementRate);
		setCoverageData(report);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to parse scoverage file.`);
	}
}

function displayCoverageData() {
	setDecorators();
	isCoverageApplied = true;
	vscode.window.visibleTextEditors.forEach(applyCodeCoverage);
}

async function cover() {
	const uri = await pickFile();
	if (!uri) {
		return;
	}
	setDecorators();
	coverageData = {};
	try {
		report = await parseReport(uri);
		packageProvider.refresh(report);
		if (!supportedVersions.includes(report.version)) {
			vscode.window.showInformationMessage(`Scoverage version ${report.version} is not supported. Supported versions are ${supportedVersions}`);
			return;
		}
		updateStatusBarItem(report.statementRate);
		setCoverageData(report);

		isCoverageApplied = true;
		vscode.window.visibleTextEditors.forEach(applyCodeCoverage);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to parse scoverage file.`);
	}
}

function setCoverageData(report: Report) {
	report.packages.forEach(p =>
		p.classes.forEach(c =>
			c.methods.forEach(m =>
				m.statements.forEach(statementCoverage)
			)
		)
	);
}

function statementCoverage(stmt: Statement) {
	const file = stmt.source;
	const decOpts = {
		start: stmt.start,
		end: stmt.end,
	};
	if (!coverageData[file]) {
		const cd: CoverageData = {
			coveredOptions: [],
			uncoveredOptions: [],
		};
		coverageData[file] = cd;
	}
	if (stmt.invocationCount > 0) {
		coverageData[file].coveredOptions.push(decOpts);
	} else {
		coverageData[file].uncoveredOptions.push(decOpts);
	}
}

function applyCodeCoverage(editor: vscode.TextEditor | undefined) {
	if (!editor) {
		return;
	}
	const cd = coverageData[editor.document.fileName];
	if (cd === undefined) {
		return;
	}
	const cov: vscode.DecorationOptions[] = [];
	const uncov: vscode.DecorationOptions[] = [];
	if (cd.coveredOptions !== undefined) {
		cd.coveredOptions.forEach(opts => {
			const startPos = editor.document.positionAt(opts.start);
			const endPos = editor.document.positionAt(opts.end);
			const dec = {
				range: editor.document.validateRange(new vscode.Range(startPos, endPos)),
			};
			cov.push(dec);
		});
	}
	if (cd.uncoveredOptions !== undefined) {
		cd.uncoveredOptions.forEach(opts => {
			const startPos = editor.document.positionAt(opts.start);
			const endPos = editor.document.positionAt(opts.end);
			const dec = {
				range: editor.document.validateRange(new vscode.Range(startPos, endPos)),
			};
			uncov.push(dec);
		});
	}
	editor.setDecorations(decorators.coveredHighlight, cov);
	editor.setDecorations(decorators.uncoveredHighlight, uncov);
}

function updateStatusBarItem(rate: number): void {
	coverageStatusBarItem.text = `Total Coverage: ${rate}%`;
	coverageStatusBarItem.show();
}
// this method is called when your extension is deactivated
export function deactivate() { }

function addOnChangeActiveTextEditorListeners(ctx: vscode.ExtensionContext) {
	if (vscode.window.activeTextEditor) {
		applyCodeCoverage(vscode.window.activeTextEditor);
	}
	vscode.window.onDidChangeActiveTextEditor(applyCodeCoverage, null, ctx.subscriptions);
}