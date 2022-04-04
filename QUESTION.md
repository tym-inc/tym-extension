
To get started, use the short "Cmd + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 
hey

### Code Snippets

[src/extension.ts#L10](src/extension.ts#L10)	
````
import { firebaseConfig } from './secrets';

export function activate(context: vscode.ExtensionContext): void {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
	const git = gitExtension?.getAPI(1);

	if (git) {
		const gitRepository = getGitRepository(git);
		if (!gitRepository) return;

		// Using firebase to store question data + get notifications when user visits the question

````

### Terminal Output
````

Now using node v14.16.0 (npm v6.14.11)
N/A: version " -> N/A" is not yet installed.

You need to run "nvm install " to install it before using it.
behzadhaghgoo@Behzads-MBP noyce % 
````
	