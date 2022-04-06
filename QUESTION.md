
To get started, use the short "Cmd + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 


### Code Snippets

[src/util.ts#L5](src/util.ts#L5)	
````typescript

export function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

````

### Terminal Output
````

````
	