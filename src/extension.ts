import * as vscode from 'vscode';
import { GitExtension } from './git';
import { getGithubLink } from './link';
import { TymCodeActionProvider } from './codeActionProvider';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { execSync } from 'child_process';
import { TymViewProvider } from './webviewProvider';
import { getNonce } from './util';
import { firebaseConfig } from './secrets';

export function activate(context: vscode.ExtensionContext): void {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);

	if (git) {
		const tymCodeActionProvider = new TymCodeActionProvider();
		context.subscriptions.push(
			vscode.commands.registerCommand('tymExtension.getGithubLink', () => getGithubLink(git)),
			vscode.languages.registerCodeActionsProvider('*', tymCodeActionProvider)
		);
	}

	// Using firebase to store question data + get notifications when user visits the question
	const app = initializeApp(firebaseConfig);
	const auth = getAuth(app);

	const tymConfig = vscode.workspace.getConfiguration('tym');
	let email = tymConfig.get<string>('email');
	let password = tymConfig.get<string>('password');

	// Automatically generate an email and password
	if (!email || email.length === 0 || !password || password.length === 0) {
		const gitEmail = execSync('git config user.email').toString().trim();
		// rudimentary check for valid email
		if (gitEmail.length > 0 && gitEmail.indexOf('@') > 0) {
			email = gitEmail;
		} else {
			email = `${getNonce()}@anonymous.com`;
		}
		password = getNonce();
		tymConfig.update('email', email);
		tymConfig.update('password', password);

		createUserWithEmailAndPassword(auth, email, password).catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
			vscode.window.showErrorMessage(
				`Oops, something went wrong. Please contact the extension creators to resolve the issue. ${errorCode}, ${errorMessage}`
			);
		});
	} else {
		signInWithEmailAndPassword(auth, email, password).catch((error) => {
			const errorCode = error.code;
			const errorMessage = error.message;
			vscode.window.showErrorMessage(
				`Oops, something went wrong. Please contact the extension creators to resolve the issue. ${errorCode}, ${errorMessage}`
			);
		});
	}

	// Webview Provider
	const provider = new TymViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(TymViewProvider.viewType, provider));
}
