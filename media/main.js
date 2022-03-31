// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { newQuestionStarted: false, questionInputs: { description: '', terminalOutput: '' } };
    let { newQuestionStarted, questionInputs } =  oldState;
    // Get questions
    vscode.postMessage({ type: 'getAskedQuestions' });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'addCodeSnippet':
                addCodeSnippet(message.value);
                break;
            case 'setAskedQuestions':
                setAskedQuestions(message.value);
                break;
        }
    });

    // For asking new questions
    const newQuestionDiv = document.querySelector('div.new-question');
    const submitQuestionBtn = document.querySelector('button.submit-question-btn');
    const createQuestionBtn = document.querySelector('button.create-question-btn');
    const xoutBtn = document.querySelector('button.xout-btn');

    const descriptionInput = document.querySelector('textarea.description');
    const terminalInput = document.querySelector('textarea.terminal-output');

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
        newQuestionStarted = false;
        questionInputs = { description: '', terminalOutput: '' };
        vscode.setState({ newQuestionStarted, questionInputs });   
    }

    xoutBtn.onclick = () => {
        closeNewQuestion();
    };

    submitQuestionBtn.onclick = () => {
        closeNewQuestion();
    };

    descriptionInput.value = questionInputs.description;
    terminalInput.value = questionInputs.terminalOutput;

    descriptionInput.oninput = (event) => {
        questionInputs.description = event.target.value;
        vscode.setState({ newQuestionStarted, questionInputs});
    };
    
    terminalInput.oninput = (event) => {
        questionInputs.terminalOutput = event.target.value;
        vscode.setState({ newQuestionStarted, questionInputs});
    };

    function addCodeSnippet(snippet) {
        if (!newQuestionStarted) {
            openNewQuestion();      
        }
    }

    // For setting asked questions
    function setAskedQuestions(questions) {
        const qDiv = document.querySelector('div.asked-questions');
        // clear div
        while (qDiv.firstChild) {
            qDiv.removeChild(qDiv.firstChild);
        }

        for (const question of questions) {
            createQuestionDiv(qDiv, question);
        }
    }

    function createQuestionDiv(parent, question) {
        const questionDiv = document.createElement('div.question');
        parent.appendChild(questionDiv);
        questionDiv.innerHTML = `<div>
            yoyo mao
            ${question}
        </div>`;

    }
}());


