import * as vscode from 'vscode';
import { getGithubRemoteInfo, getSelectionInfo, ISelectionInfo } from './link';
import { generateMarkdownString, getNonce, sendTelemetryData, setExtensionContext } from './util';
import { Repository } from './git';
import * as fs from 'fs';
import * as cp from 'child_process';

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
	private _viewOpen = false;

	constructor(private readonly _extensionUri: vscode.Uri, private readonly _gitRepository?: Repository) {
		// register command to add code snippet
		const addCodeSnippet = () => {
			sendTelemetryData('addCodeSnippet');
			// first jump to the webview
			vscode.commands.executeCommand('workbench.view.extension.tym');
			const selectionInfo = getSelectionInfo(_gitRepository);
			if (selectionInfo) {
				// send code snippet to the webview
				this._addCodeSnippet(selectionInfo);
			}
		};
		vscode.commands.registerCommand('tymExtension.addCodeSnippet', addCodeSnippet);
		vscode.commands.registerCommand('tymExtension.addCodeSnippet2', addCodeSnippet);
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		this._viewOpen = true;

		webviewView.onDidChangeVisibility(() => {
			this._viewOpen = !this._viewOpen;
		});

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case 'getRepoId': {
					const remoteInfo = getGithubRemoteInfo(this._gitRepository!);
					if (!remoteInfo) return;
					const repoId = `${remoteInfo.owner}/${remoteInfo.repo}`;
					this._view?.webview.postMessage({ type: 'setRepoId', value: repoId });
					break;
				}
				case 'setupReady': {
					this._pendingMessages.forEach((message) => {
						this._view?.webview.postMessage(message);
					});
					this._pendingMessages.length = 0;
					break;
				}
				case 'goToLocation': {
					sendTelemetryData('goToLocation');
					const { uri, startLine } = data.value;
					const startPos = new vscode.Position(startLine - 1, 0);
					vscode.commands.executeCommand(
						'editor.action.goToLocations',
						vscode.Uri.parse(uri),
						startPos,
						[startPos],
						'goto',
						'Could not find snippet.'
					);
					break;
				}
				case 'submitQuestion': {
					// Notification to let them know about sharing uncommitted changes - and then proceed once they are aware
					const tymConfig = vscode.workspace.getConfiguration('tym');
					const showDraftBranchModal = tymConfig.get<string>('showDraftBranchModal') ?? true;
					if (showDraftBranchModal) {
						const choice = await vscode.window.showInformationMessage(
							`Tym will be creating a link to your uncommitted changes (including untracked files) by pushing to Github. Make sure there are no secret keys in your code. Your draft work can only be accessed and viewed from the shareable link.`,
							{ modal: true },
							'Continue',
							"Don't Show Again"
						);
						if (choice === undefined) return;
						if (choice === "Don't Show Again") tymConfig.update('showDraftBranchModal', false, true);
					}
					const { description, terminalOutput, codeSnippets } = data.value;
					const qid = getNonce();
					sendTelemetryData('submitQuestion', { qid });
					// Add git index
					const gitRepoRoot = this._gitRepository!.rootUri.path;
					const parentCommitId = this._gitRepository!.state?.HEAD?.commit;
					const gitIndexLocation = `${gitRepoRoot}/.git/index`;
					if (!parentCommitId) {
						sendTelemetryData('submitQuestionFailed', { reason: 'parentCommitId is undefined' });
						return;
					}
					const remoteInfo = getGithubRemoteInfo(this._gitRepository!);
					if (!remoteInfo) {
						sendTelemetryData('submitQuestionFailed', { reason: 'remoteInfo is undefined' });
						vscode.window.showErrorMessage('Failed to generate shareable link: unable to detect Github remote.');
						return;
					}
					const { owner, repo } = remoteInfo;
					// Store git index into memory
					const readme = generateMarkdownString(description, terminalOutput, codeSnippets);
					const gitIndex = fs.readFileSync(gitIndexLocation);
					// push to secret ref
					cp.execSync(`git add -A`, { cwd: gitRepoRoot });
					const readmeHash = cp
						.execSync(`git hash-object -w --stdin`, { input: readme, cwd: gitRepoRoot })
						.toString()
						.trim();
					cp.execSync(`git update-index --add --cacheinfo 100644 ${readmeHash} QUESTION.md`, { cwd: gitRepoRoot });
					const treeHash = cp.execSync(`git write-tree`, { cwd: gitRepoRoot }).toString().trim();
					const commitHash = cp
						.execSync(`git commit-tree ${treeHash} -p ${parentCommitId} -m "${qid}"`, { cwd: gitRepoRoot })
						.toString()
						.trim();
					cp.execSync(`git update-ref refs/tym/${qid} ${commitHash}`, { cwd: gitRepoRoot });
					cp.execSync(`git push origin refs/tym/${qid}:refs/tym/${qid}`, { cwd: gitRepoRoot });
					cp.execSync(`git update-ref -d refs/tym/${qid}`, { cwd: gitRepoRoot });
					// write index back
					fs.writeFileSync(gitIndexLocation, gitIndex);

					// Get shareable link
					const githubLink = `https://github.dev/${owner}/${repo}/blob/${commitHash}/QUESTION.md`;
					vscode.env.clipboard.writeText(githubLink);
					vscode.window.showInformationMessage('Shareable link copied!');
					vscode.env.openExternal(vscode.Uri.parse(githubLink));

					this._view?.webview.postMessage({ type: 'pushedToGithub', value: { qid, link: githubLink } });
					break;
				}
				case 'markAsResolved': {
					const gitRepoRoot = this._gitRepository!.rootUri.path;
					sendTelemetryData('markAsResolved');
					const qid = data.value;
					cp.execSync(`git push origin :refs/tym/${qid}`, { cwd: gitRepoRoot });
					break;
				}
				case 'copyShareableLink': {
					sendTelemetryData('copyShareableLink');
					vscode.env.clipboard.writeText(data.value);
					vscode.window.showInformationMessage('Shareable link copied!');
					vscode.env.openExternal(vscode.Uri.parse(data.value));
					break;
				}
				case 'setOpenQuestion': {
					vscode.commands.executeCommand('setContext', 'tym.openQuestion', data.value);
					setExtensionContext('openQuestion', data.value);
				}
			}
		});
	}

	private _addCodeSnippet(codeSnippet: ISelectionInfo): void {
		const message = { type: 'addCodeSnippet', value: codeSnippet };
		if (this._view && this._viewOpen) {
			this._view.webview.postMessage(message);
		} else {
			this._pendingMessages.push(message);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		if (!this._gitRepository || !getGithubRemoteInfo(this._gitRepository)) {
			return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
			</head>
			<body>
				The folder currently open doesn't have a git repository or does not have a GitHub remote. 
				<br/>
				<br/>
				Open a git repository with a GitHub remote in order to use Tym.
			</body>
			</html>`;
		}
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
