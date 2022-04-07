import { CancellationToken, CodeActionContext, CodeActionProvider, Command, Range, TextDocument, window } from 'vscode';
import { getExtensionContext } from './util';

export class TymCodeActionProvider implements CodeActionProvider {
	constructor(private readonly _extensionActivated: boolean) {}

	provideCodeActions(
		_document: TextDocument,
		_range: Range,
		_context: CodeActionContext,
		_token: CancellationToken
	): Command[] | Thenable<Command[]> {
		return new Promise((resolve) => {
			if (!this._extensionActivated) resolve([]);
			const questionOpen = getExtensionContext('openQuestion');
			const snippetText = questionOpen ? 'Add Snippet to Question' : 'Ask a Question About Snippet';
			const selection = window?.activeTextEditor?.selection;
			if (!selection?.start.isEqual(selection?.end)) {
				const commands: Command[] = [
					{
						title: 'Get Github Link',
						command: 'tymExtension.getGithubLink'
					},
					{
						title: snippetText,
						command: 'tymExtension.addCodeSnippet'
					}
				];
				resolve(commands);
			}
			resolve([]);
		});
	}
}
