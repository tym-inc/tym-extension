import * as vscode from 'vscode';
import { getDatabase, ref, set, onValue, update } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getSelectionInfo, ISelectionInfo } from './link';
import { getNonce } from './util';
import { Repository } from './git';

interface IQuestion {
	id: string;
	description: string;
	terminalOutput: string;
	codeSnippets: ISelectionInfo;
	resolved: boolean;
}

export class TymViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'tym.collaborationView';
	private readonly _pendingMessages: any[] = [];
	private _view?: vscode.WebviewView;
	private readonly _questions: IQuestion[] = [];

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _gitRepository: Repository
	) {
		// register command to add code snippet
		vscode.commands.registerCommand('tymExtension.addCodeSnippet', () => {
			// first jump to the webview
			vscode.commands.executeCommand('workbench.view.extension.tym');
			const selectionInfo = getSelectionInfo(_gitRepository);
			if (selectionInfo) {
				// send code snippet to the webview
				this._addCodeSnippet(selectionInfo);
			}
		});

		const auth = getAuth();
		const db = getDatabase();
		
		auth.onAuthStateChanged(user => {
			if (user) {
				onValue(ref(db, user.uid), (snapshot: any) => {
					const data = snapshot.val();
					if (data) {
						this._questions.length = 0;
						Object.entries(data).filter(([_qid, question]: any) => {
							return !question.resolved;
						}).forEach(([qid, question]: any) => {
							this._questions.push({id: qid, ...question});
						});

						const message = { type: 'setAskedQuestions', value: this._questions };
						if (this._view) {
							this._view.webview.postMessage(message);
						} else {
							this._pendingMessages.push(message);
						}
					}
				});
			}
		});
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): void {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'getAskedQuestions':
					{
						this._view?.webview.postMessage({ type: 'setAskedQuestions', value: this._questions });
						break;
					}
				case 'goToLocation':
					{
						const { uri, startLine } = data.value;
						const startPos = new vscode.Position(startLine - 1, 0);
						vscode.commands.executeCommand('editor.action.goToLocations', vscode.Uri.parse(uri), startPos, [startPos], 'goto', 'Could not find snippet.');
						break;
					}
				case 'submitQuestion':
					{
						// TODO let them know about sharing uncommitted changes - and then proceed once they are aware
						const { description, terminalOutput, codeSnippets } = data.value;
						const db = getDatabase();
						const uid = getAuth().currentUser?.uid;
						if (uid) {
							// TODO create README.md add to git index
							// push to secret ref
	
							// Get shareable link
							
							// TODO set ref
							set(ref(db, `${uid}/${getNonce()}`), {
								description,
								terminalOutput,
								codeSnippets,
								resolved: false
							});							
						}
						break;
					}
				case 'markAsResolved':
					{
						const qid = data.value;
						const db = getDatabase();
						const uid = getAuth().currentUser?.uid;
						if (uid) {
							update(ref(db, `${uid}/${qid}`), {
								resolved: true
							});							
						} 
						break;
					}
				case 'copyShareableLink':
					{
						console.log('Generate shareable link', data.value);
						break;
					}
			}
		});

		this._pendingMessages.forEach(message => {
			this._view?.webview.postMessage(message);
		});
	}

	private _addCodeSnippet(codeSnippet: ISelectionInfo): void {
		const message = { type: 'addCodeSnippet', value: codeSnippet };
		if (this._view) {
			this._view.webview.postMessage(message);
		} else {
			this._pendingMessages.push(message);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Tym</title>
			</head>
			<body>
				<div>
					<div class="asked-questions"></div>
					<br />
					<div class="new-question">
						<div class="flex flex-col">
							<div class="flex flex-row justify-between">
								<h3>Ask a Question</h3>
								<button class="xout-btn">x</button>
							</div>
							<textarea class="description mt" type="text" placeholder="Brief description (optional)"></textarea>
							<div class="mt">
								<h4>Code Snippets</h4>
								<div class="code-snippets flex flex-col"></div>
								<div class="snippet-hint">
									Hint: To add a code-snippet here, select the snippet with the editor, right click, and click on "Add snippet to question".
								</div>
							</div>
							<div class="mt">
								<h4>Terminal Output</h4>
								<textarea class="terminal-output" placeholder="Paste your terminal output here (optional)"></textarea>
							</div>
							<button class="mt submit-question-btn">Done</button>
						</div>
					</div>
					<button class="create-question-btn">Create question</button>
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}