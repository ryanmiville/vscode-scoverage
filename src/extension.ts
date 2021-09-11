// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseReport, Report, Statement } from './scoverage';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('helloworld.helloWorld', () => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			// vscode.window.showInformationMessage('Hello World from HelloWorld!');
			setDecorators();
			cover();
		})
	);
}

interface DecOpts {
	start: number;
	end: number;
}

interface CoverageData {
	uncoveredOptions: DecOpts[];
	coveredOptions: DecOpts[];
}
let coverageData: { [key: string]: CoverageData } = {}; // actual file path to the coverage data.

interface Highlight {
	top: vscode.TextEditorDecorationType;
	mid: vscode.TextEditorDecorationType;
	bot: vscode.TextEditorDecorationType;
	all: vscode.TextEditorDecorationType;
}

let decorators: {
	type: 'highlight' | 'gutter';
	coveredHighlight: Highlight;
	uncoveredHighlight: Highlight;
};

let decoratorConfig: {
	[key: string]: any;
	type: 'highlight' | 'gutter';
	coveredHighlightColor: string;
	uncoveredHighlightColor: string;
	coveredBorderColor: string;
	uncoveredBorderColor: string;
};

function setDecorators() {
	decoratorConfig = {
		type: 'highlight',
		coveredHighlightColor: 'rgba(64,128,128,0.5)',
		coveredBorderColor: 'rgba(64,128,128,1.0)',
		uncoveredHighlightColor: 'rgba(128,64,64,0.25)',
		uncoveredBorderColor: 'rgba(128,64,64,1.0)',
	};

	const f = (x: { overviewRulerColor: string; backgroundColor: string }, arg: string) => {
		const y = {
			overviewRulerLane: 2,
			borderStyle: arg,
			borderWidth: '2px'
		};
		return Object.assign(y, x);
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
	const ctop = f(cov, 'solid solid none solid');
	const cmid = f(cov, 'none solid none solid');
	const cbot = f(cov, 'none solid solid solid');
	const cone = f(cov, 'solid solid solid solid');
	const utop = f(uncov, 'solid solid none solid');
	const umid = f(uncov, 'none solid none solid');
	const ubot = f(uncov, 'none solid solid solid');
	const uone = f(uncov, 'solid solid solid solid');

	const cnone = f(cov, 'none none none none');
	const unone = f(uncov, 'none none none none');
	decorators = {
		type: decoratorConfig.type,
		coveredHighlight: {
			// all: vscode.window.createTextEditorDecorationType(cone),
			all: vscode.window.createTextEditorDecorationType(cnone),
			top: vscode.window.createTextEditorDecorationType(ctop),
			mid: vscode.window.createTextEditorDecorationType(cmid),
			bot: vscode.window.createTextEditorDecorationType(cbot)
		},
		uncoveredHighlight: {
			// all: vscode.window.createTextEditorDecorationType(uone),
			all: vscode.window.createTextEditorDecorationType(unone),
			top: vscode.window.createTextEditorDecorationType(utop),
			mid: vscode.window.createTextEditorDecorationType(umid),
			bot: vscode.window.createTextEditorDecorationType(ubot)
		}
	};
}

async function cover() {
	coverageData = {};
	const report = await parseReport();

	setCoverageData(report);
	vscode.window.visibleTextEditors.forEach(applyCodeCoverage);
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
	if (coverageData[file] === undefined) {
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

function applyCodeCoverage(editor: vscode.TextEditor) {
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
	editor.setDecorations(decorators.coveredHighlight.all, cov);
	editor.setDecorations(decorators.uncoveredHighlight.all, uncov);
}

// this method is called when your extension is deactivated
export function deactivate() { }
