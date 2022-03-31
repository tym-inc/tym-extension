import { API, Remote, Repository } from './git';
import * as vscode from 'vscode';

interface IGithubRemoteInfo {
	owner: string;
	repo: string;
}

interface ISelectionInfo {
	startLine: number;
	endLine: number;
	relativePath: string;
}

export async function getGithubLink(git: API) {
	const repositories = git.repositories;
	if (repositories.length <= 0) return;
	const repository = repositories[0];

	const selectionInfo = getSelectionInfo(repository);

	const githubRemoteInfo = getGithubRemoteInfo(repository);
	const branch = repository.state.HEAD?.name;
	if (!githubRemoteInfo || !selectionInfo || !branch) return;
	const isCommitted = await isSelectionCommitted(repository, selectionInfo);
	if (!isCommitted) {
		vscode.window.showErrorMessage('Failed to generate Github link: selected text is not committed yet.');
		return;
	}
	await adjustSelectionLines(repository, selectionInfo);
	const { owner, repo } = githubRemoteInfo;
	const { relativePath, startLine, endLine } = selectionInfo;
	const githubLink = `https://github.dev/${owner}/${repo}/blob/${branch}/${relativePath}#L${startLine}-L${endLine}`;
	vscode.env.clipboard.writeText(githubLink);
	vscode.window.showInformationMessage('Github Link copied!');
}

function getSelectionInfo(repository: Repository): ISelectionInfo | undefined {
	const editor = vscode.window.activeTextEditor;
	if (!editor?.selection) return undefined;
	const { start, end } = editor.selection;
	const relativePath = getRelativePath(repository.rootUri, editor.document.uri);
	if (!relativePath) return;
	return {
		relativePath,
		startLine: start.line + 1,
		endLine: end.line + 1
	};
}

class LineTracker {
	private _lineNumber: number;
	private _adjustment: number;
	doneAdjusting: boolean;
	waitingForHead: boolean;

	constructor(lineNumber: number) {
		this._lineNumber = lineNumber;
		this._adjustment = 0;
		this.doneAdjusting = false;
		this.waitingForHead = true;
	}

	adjust(adjustment: number, lineNumber: number) {
		if (!this.doneAdjusting) {
			if (lineNumber < this._lineNumber) this._adjustment += adjustment;
			else if (lineNumber > this._lineNumber) this.waitingForHead = false;
			else {
				this._adjustment += adjustment;
				this.doneAdjusting = true;
			}
		}
	}
	get lineNumber() {
		return this._lineNumber + this._adjustment;
	}
}

async function adjustSelectionLines(repository: Repository, selectionInfo: ISelectionInfo) {
	let { startLine, endLine } = selectionInfo;
	const changes = await repository.diffWithHEAD(selectionInfo.relativePath);
	if (!changes) return false;
	const DIFF_CHANGE_REGEX =
		/@@ -(?<oldStartLine>[0-9]*),(?<oldNumLines>[0-9]*) \+(?<newStartLine>[0-9]*),(?<newNumLines>[0-9]*) @@/;
	const start = new LineTracker(startLine);
	const end = new LineTracker(endLine);
	let lineNumber = -1;
	for (const line of changes.split('\n')) {
		const changeHead = line.match(DIFF_CHANGE_REGEX);
		if (changeHead?.groups) {
			const { oldNumLines, newStartLine, newNumLines } = changeHead.groups;
			const oldNumLinesInt = parseInt(oldNumLines),
				newStartLineInt = parseInt(newStartLine),
				newNumLinesInt = parseInt(newNumLines);
			lineNumber = newStartLineInt + newNumLinesInt - 1;
			const adjustment = oldNumLinesInt - newNumLinesInt;
			start.adjust(adjustment, lineNumber);
			end.adjust(adjustment, lineNumber);
			lineNumber = newStartLineInt;
		} else {
			switch (line[0]) {
				case '-': {
					if (!start.waitingForHead) {
						start.adjust(1, lineNumber);
					}
					if (!end.waitingForHead) {
						end.adjust(1, lineNumber);
					}
					break;
				}
				case '+': {
					if (!start.waitingForHead) {
						start.adjust(-1, lineNumber);
					}
					if (!end.waitingForHead) {
						end.adjust(-1, lineNumber);
					}
					lineNumber += 1;
					break;
				}
				default: {
					lineNumber += 1;
					break;
				}
			}
		}
		if (start.doneAdjusting && end.doneAdjusting) {
			break;
		}
	}
	console.log('startLine', start.lineNumber);
	console.log('endLine', end.lineNumber);
	selectionInfo.startLine = start.lineNumber;
	selectionInfo.endLine = end.lineNumber;
}

async function isSelectionCommitted(repository: Repository, selectionInfo: ISelectionInfo): Promise<boolean> {
	const UNCOMMITTED_BLAME_REGEX = /00000000 \(Not Committed Yet[-+: 0-9]*(?<lineNumber> [0-9]*)\)/g;
	const blame = await repository.blame(selectionInfo.relativePath);
	const matches = blame.matchAll(UNCOMMITTED_BLAME_REGEX);
	for (const match of matches) {
		const uncommittedNumber = parseInt(match?.groups?.lineNumber || '-1');
		if (uncommittedNumber === -1) continue;
		if (isNumberInRange(uncommittedNumber, selectionInfo.startLine, selectionInfo.endLine)) {
			return false;
		}
	}
	return true;
}

function isNumberInRange(number: number, start: number, end: number): boolean {
	return start <= number && end >= number;
}

function getRelativePath(ancestor: vscode.Uri, descendant: vscode.Uri) {
	const ancestorParts = ancestor.path.split('/');
	const descendantParts = descendant.path.split('/');
	if (ancestorParts.length >= descendantParts.length) return undefined;
	for (let i = 0; i < ancestorParts.length; i++) {
		if (ancestorParts[i] !== descendantParts[i]) {
			return undefined;
		}
	}
	return descendantParts.slice(ancestorParts.length).join('/');
}

function getGithubRemoteInfo(repository: Repository): IGithubRemoteInfo | undefined {
	const remotes = repository.state.remotes;
	const originRemote = findOriginRemote(remotes);
	if (originRemote?.fetchUrl) {
		return parseGithubRemoteInfoFromUrl(originRemote.fetchUrl);
	}
	return undefined;
}

function parseGithubRemoteInfoFromUrl(githubUrl: string): IGithubRemoteInfo | undefined {
	const GITHUB_REMOTE_REGEX = /github\.com.(?<owner>[^!@#$%^&*\/\\]*)\/(?<repo>[^!@#$%^&*\/\\]*)\.git/;
	if (githubUrl) {
		const matches = githubUrl?.match(GITHUB_REMOTE_REGEX);
		if (matches?.groups) {
			const { owner, repo } = matches.groups;
			return { owner, repo };
		}
	}
	return undefined;
}

function findOriginRemote(remotes: Remote[]): Remote | undefined {
	let originRemote = undefined;
	if (remotes.length > 0) {
		originRemote = remotes[0];
		for (const remote of remotes) {
			if (remote.name === 'origin') {
				originRemote = remote;
			}
		}
	}
	return originRemote;
}
