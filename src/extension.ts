import * as vscode from 'vscode';
import { GitExtension } from './git';
import { getGithubLink, getGithubRemoteInfo, getGitRepository } from './link';
import { TymCodeActionProvider } from './codeActionProvider';
import { TymViewProvider } from './webviewProvider';
import { identifyUser, sendTelemetryData } from './util';

export function activate(context: vscode.ExtensionContext): void {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);
	vscode.commands.executeCommand('setContext', 'tym.active', false);
	if (git) {
		const gitRepository = getGitRepository(git);
		if (gitRepository) {
			vscode.commands.executeCommand('setContext', 'tym.active', true);
		}

		sendTelemetryData('extensionActivated');
		identifyUser();

		const tymCodeActionProvider = new TymCodeActionProvider(!!gitRepository);
		context.subscriptions.push(
			vscode.commands.registerCommand('tymExtension.getGithubLink', () => getGithubLink(gitRepository)),
			vscode.languages.registerCodeActionsProvider('*', tymCodeActionProvider)
		);

		// Webview Provider
		const provider = new TymViewProvider(context.extensionUri, gitRepository);
		context.subscriptions.push(vscode.window.registerWebviewViewProvider(TymViewProvider.viewType, provider));
	}
}
