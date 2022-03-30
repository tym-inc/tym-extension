import * as vscode from 'vscode';
import { GitExtension } from './git';
import cp = require('child_process');

export function activate(_context: vscode.ExtensionContext): void {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);

	if (git) {
		console.log('cp', cp);
	}

	// context.subscriptions.push(disposable);
}
