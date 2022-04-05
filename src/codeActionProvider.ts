import { CancellationToken, CodeActionContext, CodeActionProvider, Command, Range, TextDocument, window } from 'vscode';

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
			const selection = window?.activeTextEditor?.selection;
			if (!selection?.start.isEqual(selection?.end)) {
				const commands: Command[] = [
					{
						title: 'Get Github Link',
						command: 'tymExtension.getGithubLink'
					},
					{
						title: 'Add Snippet to Question',
						command: 'tymExtension.addCodeSnippet'
					}
				];
				resolve(commands);
			}
			resolve([]);
		});
	}
}
