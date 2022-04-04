
To get started, use the short "Cmd + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 
What does this class do?

### Code Snippets

[src/webviewProvider.ts#L18](src/webviewProvider.ts#L18)	
````
export class TymViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'tym.collaborationView';
	private readonly _pendingMessages: any[] = [];
	private _view?: vscode.WebviewView;
	private readonly _questions: IQuestion[] = [];

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _gitRepository: Repository
	) {

````

### Terminal Output
````
~/repo/tym-extension master *1 !2 ?1 ❯                                                                                               15:02:56
````
	