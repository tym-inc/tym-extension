import * as vscode from 'vscode';
import { getNonce } from './util';

export class TymViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'tym.collaborationView';
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

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
			console.log('on received message');
			switch (data.type) {
				case 'getAskedQuestions':
					{
						vscode.window.showInformationMessage('getAskedQuestions');
						this._view?.webview.postMessage({ type: 'setAskedQuestions', value: ['a', 'b', 'c'] });
						break;
					}
			}
		});
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
								<div class="code-snippets flex flex-col">
									<div>
										<div class="snippet-context flex flex-row justify-between">
											<a class="file-info">src/webviewProvider.ts#L3-L3</a>
										</div>
										<div class="snippet">
											<div class="snippet-line">
												schedule.every(1).seconds.do(job)
											</div>
											<div class="snippet-line">
												schedule.every(5).seconds.do(less_frequent_job)
											</div>
										</div>
									</div>
								</div>
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