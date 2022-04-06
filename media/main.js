// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
	const vscode = acquireVsCodeApi();

	const oldState = vscode.getState() || {
		newQuestionStarted: false,
		questionInputs: { description: '', terminalOutput: '', codeSnippets: [] }
	};
	let { newQuestionStarted, questionInputs } = oldState;
	// Get questions
	vscode.postMessage({ type: 'getAskedQuestions' });

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', (event) => {
		const message = event.data; // The json data that the extension sent
		switch (message.type) {
			case 'addCodeSnippet':
				addCodeSnippet(message.value);
				break;
			case 'setAskedQuestions':
				setAskedQuestions(message.value);
				break;
			case 'closeNewQuestion':
				closeNewQuestion();
				break;
		}
	});

	// For asking new questions
	const newQuestionDiv = document.querySelector('div.new-question');
	const createQuestionBtn = document.querySelector('button.create-question-btn');
	const submitQuestionBtn = newQuestionDiv.querySelector('button.submit-question-btn');
	const xoutBtn = newQuestionDiv.querySelector('button.xout-btn');

	const descriptionInput = newQuestionDiv.querySelector('textarea.description');
	const terminalInput = newQuestionDiv.querySelector('textarea.terminal-output');

	const snippetsDiv = newQuestionDiv.querySelector('div.code-snippets');
	const snippetHint = newQuestionDiv.querySelector('div.snippet-hint');

	if (newQuestionStarted) {
		newQuestionDiv.style = 'display: block';
		createQuestionBtn.style = 'display: none;';
	} else {
		newQuestionDiv.style = 'display: none';
		createQuestionBtn.style = 'display: block;';
	}

	function openNewQuestion() {
		createQuestionBtn.style = 'display: none';
		newQuestionDiv.style = 'display: block';
		newQuestionStarted = true;
		vscode.commands.executeCommand('setContext', 'tym.openQuestion', true);
		vscode.setState({ newQuestionStarted, questionInputs });
	}

	createQuestionBtn.onclick = () => {
		openNewQuestion();
	};

	function closeNewQuestion() {
		createQuestionBtn.style = 'display: block';
		newQuestionDiv.style = 'display: none';
		descriptionInput.value = '';
		terminalInput.value = '';
		setCodeSnippets([]);
		newQuestionStarted = false;
		questionInputs = { description: '', terminalOutput: '', codeSnippets: [] };
		vscode.commands.executeCommand('setContext', 'tym.openQuestion', false);
		vscode.setState({ newQuestionStarted, questionInputs });
	}

	xoutBtn.onclick = () => {
		closeNewQuestion();
	};

	submitQuestionBtn.onclick = () => {
		vscode.postMessage({ type: 'submitQuestion', value: questionInputs });
	};

	descriptionInput.value = questionInputs.description;
	terminalInput.value = questionInputs.terminalOutput;

	descriptionInput.oninput = (event) => {
		questionInputs.description = event.target.value;
		vscode.setState({ newQuestionStarted, questionInputs });
	};

	terminalInput.oninput = (event) => {
		questionInputs.terminalOutput = event.target.value;
		vscode.setState({ newQuestionStarted, questionInputs });
	};

	setCodeSnippets(questionInputs.codeSnippets);

	function addCodeSnippet(snippet) {
		if (!newQuestionStarted) {
			openNewQuestion();
		}
		questionInputs.codeSnippets.push(snippet);
		vscode.setState({ newQuestionStarted, questionInputs });
		setCodeSnippets(questionInputs.codeSnippets);
	}

	function setCodeSnippets(snippets) {
		if (snippets.length === 0) {
			snippetHint.style = 'display: block;';
		} else {
			snippetHint.style = 'display: none;';
		}

		while (snippetsDiv.firstChild) {
			snippetsDiv.removeChild(snippetsDiv.firstChild);
		}

		for (const i in snippets) {
			appendSingleSnippet(i, snippets[i], snippetsDiv);
		}
	}

	function appendSingleSnippet(index, snippet, parent, showRemove = true) {
		const singleSnippetDiv = document.createElement('div');
		parent.appendChild(singleSnippetDiv);
		const { relativePath, content, uri, startLine, endLine } = snippet;
		const clickableFilename = `${relativePath}:${startLine}`;

		singleSnippetDiv.innerHTML = `
            <div class="snippet-context flex flex-row justify-between">
                <a class="clickable-link file-location" href="Open in editor">${clickableFilename}</a>
                ${showRemove ? '<a class="clickable-link remove" href="Remove snippet">Remove</a>' : ''}
            </div>
            <div class="snippet-code">
            </div>
        `;

		const codeDiv = singleSnippetDiv.querySelector('div.snippet-code');
		codeDiv.textContent = content;

		singleSnippetDiv.querySelector('a.clickable-link.file-location').onclick = () => {
			vscode.postMessage({ type: 'goToLocation', value: { uri, startLine, endLine } });
		};

		if (showRemove) {
			singleSnippetDiv.querySelector('a.clickable-link.remove').onclick = () => {
				questionInputs.codeSnippets.splice(index, 1);
				vscode.setState({ newQuestionStarted, questionInputs });
				setCodeSnippets(questionInputs.codeSnippets);
			};
		}
	}

	// For setting asked questions
	function setAskedQuestions(questions) {
		const askedQuestionsDiv = document.querySelector('div.asked-questions');
		// clear div
		while (askedQuestionsDiv.firstChild) {
			askedQuestionsDiv.removeChild(askedQuestionsDiv.firstChild);
		}

		for (const question of questions) {
			createQuestionDiv(askedQuestionsDiv, question);
		}
	}

	function createQuestionDiv(parent, question) {
		const questionDiv = document.createElement('div');
		questionDiv.classList.add('asked-question', 'mt');
		parent.appendChild(questionDiv);

		questionDiv.innerHTML = `
            <div class="flex flex-col">
                <div class="flex flex-row justify-between">
                    <h3>Question</h3>
                    <a class="clickable-link shareable-link" href="Copy link to clipboard">Share</a>
                </div>
                <div class="mt">
                    <div class="asked-description"></div>
                </div>
                <div class="mt">
                    <h4>Code Snippets</h4>
                    <div class="code-snippets flex flex-col"></div>
                </div>
                <div class="mt">
                    <h4>Terminal Output</h4>
                    <div class="asked-terminal-output"></div>
                </div>
                <button class="mt mark-as-resolved">Mark as Resolved</button>
            </div>
        `;

		const description = questionDiv.querySelector('div.asked-description');
		const terminal = questionDiv.querySelector('div.asked-terminal-output');
		const codeSnippets = questionDiv.querySelector('div.code-snippets');
		const shareLink = questionDiv.querySelector('a.shareable-link');
		const markAsResolved = questionDiv.querySelector('button.mark-as-resolved');

		description.textContent = question.description;
		terminal.textContent = question.terminalOutput;

		for (const i in question.codeSnippets) {
			appendSingleSnippet(i, question.codeSnippets[i], codeSnippets, false);
		}

		shareLink.onclick = () => {
			vscode.postMessage({ type: 'copyShareableLink', value: question.link });
		};

		markAsResolved.onclick = () => {
			vscode.postMessage({ type: 'markAsResolved', value: question.id });
		};
	}
})();
