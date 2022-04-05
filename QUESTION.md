
To get started, use the short "Cmd + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 
one two three

### Code Snippets

[src/link.ts#L10](src/link.ts#L10)	
````typescript
export interface ISelectionInfo {
	startLine: number;
	endLine: number;
	relativePath: string;
	uri: string;
	content: string;
}

export function getGitRepository(git: API): Repository | undefined {
	const repositories = git.repositories;
	if (repositories.length <= 0) return undefined;

````

### Terminal Output
````
tym.svg
uploading.gif
~$atement of Purpose.docx
~$e Next Step_02.01.2021.docx
~$tient Request for Access to Records (2).docx
````
	