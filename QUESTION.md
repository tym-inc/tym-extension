
To get started, use the short "Cmd + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 


### Code Snippets

[src/git.d.ts#L270](src/git.d.ts#L270)	
````
	readonly repositories: Repository[];
	readonly on
	
	
	
	DidOpenRepository: Event<Repository>;
	readonly onDidCloseRepository: Event<Repository>;

````

[src/extension.ts#L7](src/extension.ts#L7)	
````
import { execSync } from 'child_process';
import { TymViewProvider } from './webviewProvider';
import { getNonce, sendTelemetryData } from './util';
import { firebaseConfig } from './secrets';

export function activate(context: vscode.ExtensionContext): void {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);

	if (git) {
		const gitRepository = getGitRepository(git);
		if (!gitRepository) return;

````

### Terminal Output
````

````
	