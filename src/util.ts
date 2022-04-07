import { ISelectionInfo } from './link';
import { posthogAnalyticsUrl, posthogApiKey } from './secrets';
import * as https from 'https';
import { execSync } from 'child_process';

export function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function sendTelemetryData(eventName: string, data?: Record<string, unknown>, type: string = 'capture'): void {
	const dataString = JSON.stringify({
		api_key: posthogApiKey,
		event: eventName,
		properties: {
			distinct_id: getUserEmail(),
			type,
			...data
		},
		timestamp: new Date().toISOString()
	});
	const req = https.request(
		posthogAnalyticsUrl,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Content-Length': dataString.length }
		},
		() => {}
	);
	req.write(dataString);
	req.end();
}

export function identifyUser(): void {
	sendTelemetryData('$identify', { $set: { name: getUserName() ?? getUserEmail(), email: getUserEmail() } }, 'screen');
}

function getUserName(): string | undefined {
	const gitName = execSync(`git config user.name`).toString().trim();
	return gitName.length > 0 ? gitName : undefined;
}

function getUserEmail(): string | undefined {
	const gitEmail = execSync('git config user.email').toString().trim();
	return gitEmail.length > 0 ? gitEmail : undefined;
}

export function generateMarkdownString(
	description: string,
	terminalOutput: string,
	codeSnippets: ISelectionInfo[]
): string {
	const codeMarkdown = codeSnippets
		.map(({ startLine, content, relativePath }) => {
			const language = getLanguage(relativePath);
			return `
[${relativePath}#L${startLine}](${relativePath}#L${startLine})	
\`\`\`\`${language}\n${content}\n\`\`\`\``;
		})
		.join('\n');

	return `
To get started, use the shortcut "⌘ + Shift + V" to preview the markdown. Alternatively, click on the preview button on the top right corner.

## Question 
${description}

### Code Snippets
${codeMarkdown}

### Terminal Output
\`\`\`\`
${terminalOutput}
\`\`\`\`
	`;
}

const extensionContext = new Map();
export function getExtensionContext(key: string) {
	return extensionContext.get(key);
}
export function setExtensionContext(key: string, value: any) {
	return extensionContext.set(key, value);
}

const languageMap: { [key: string]: string } = {
	feature: 'Cucumber',
	abap: 'abap',
	adb: 'ada',
	ads: 'ada',
	ada: 'ada',
	ahk: 'ahk',
	ahkl: 'ahk',
	htaccess: 'apacheconf',
	'apache.conf': 'apacheconf',
	'apache2.conf': 'apacheconf',
	applescript: 'applescript',
	as: 'as',
	as3: 'as3',
	asy: 'asy',
	sh: 'bash',
	ksh: 'bash',
	bash: 'bash',
	ebuild: 'bash',
	eclass: 'bash',
	bat: 'bat',
	cmd: 'bat',
	befunge: 'befunge',
	bmx: 'blitzmax',
	boo: 'boo',
	bf: 'brainfuck',
	b: 'brainfuck',
	c: 'c',
	h: 'c',
	cfm: 'cfm',
	cfml: 'cfm',
	cfc: 'cfm',
	tmpl: 'cheetah',
	spt: 'cheetah',
	cl: 'cl',
	lisp: 'cl',
	el: 'cl',
	clj: 'clojure',
	cljs: 'clojure',
	cmake: 'cmake',
	'cmakelists.txt': 'cmake',
	coffee: 'coffeescript',
	'sh-session': 'console',
	control: 'control',
	cpp: 'cpp',
	hpp: 'cpp',
	'c++': 'cpp',
	'h++': 'cpp',
	cc: 'cpp',
	hh: 'cpp',
	cxx: 'cpp',
	hxx: 'cpp',
	pde: 'cpp',
	cs: 'csharp',
	css: 'css',
	pyx: 'cython',
	pxd: 'cython',
	pxi: 'cython',
	d: 'd',
	di: 'd',
	diff: 'diff',
	patch: 'diff',
	dpatch: 'dpatch',
	darcspatch: 'dpatch',
	duel: 'duel',
	jbst: 'duel',
	dylan: 'dylan',
	dyl: 'dylan',
	erb: 'erb',
	'erl-sh': 'erl',
	erl: 'erlang',
	hrl: 'erlang',
	evoque: 'evoque',
	factor: 'factor',
	flx: 'felix',
	flxh: 'felix',
	f: 'fortran',
	f90: 'fortran',
	s: 'gas',
	S: 'gas',
	kid: 'genshi',
	vert: 'glsl',
	frag: 'glsl',
	geo: 'glsl',
	plot: 'gnuplot',
	plt: 'gnuplot',
	go: 'go',
	'1234567': 'groff',
	man: 'groff',
	haml: 'haml',
	hs: 'haskell',
	html: 'html',
	htm: 'html',
	xhtml: 'html',
	hx: 'hx',
	hy: 'hybris',
	hyb: 'hybris',
	ini: 'ini',
	cfg: 'ini',
	io: 'io',
	ik: 'ioke',
	weechatlog: 'irc',
	jade: 'jade',
	java: 'java',
	js: 'js',
	jsp: 'jsp',
	lhs: 'lhs',
	ll: 'llvm',
	lgt: 'logtalk',
	lua: 'lua',
	wlua: 'lua',
	mak: 'make',
	makefile: 'make',
	gnumakefile: 'make',
	mao: 'mako',
	maql: 'maql',
	mhtml: 'mason',
	mc: 'mason',
	mi: 'mason',
	autohandler: 'mason',
	dhandler: 'mason',
	md: 'markdown',
	mo: 'modelica',
	def: 'modula2',
	mod: 'modula2',
	moo: 'moocode',
	mu: 'mupad',
	mxml: 'mxml',
	myt: 'myghty',
	autodelegate: 'myghty',
	asm: 'nasm',
	ns2: 'newspeak',
	objdump: 'objdump',
	m: 'objectivec',
	j: 'objectivej',
	ml: 'ocaml',
	mli: 'ocaml',
	mll: 'ocaml',
	mly: 'ocaml',
	ooc: 'ooc',
	pl: 'perl',
	pm: 'perl',
	php: 'php',
	php345: 'php',
	ps: 'postscript',
	eps: 'postscript',
	pot: 'pot',
	po: 'pot',
	pov: 'pov',
	inc: 'pov',
	prolog: 'prolog',
	pro: 'prolog',
	properties: 'properties',
	proto: 'protobuf',
	py3tb: 'py3tb',
	pytb: 'pytb',
	py: 'python',
	pyw: 'python',
	sc: 'python',
	sconstruct: 'python',
	sconscript: 'python',
	tac: 'python',
	r: 'r',
	rb: 'rb',
	rbw: 'rb',
	rakefile: 'rb',
	rake: 'rb',
	gemspec: 'rb',
	rbx: 'rb',
	duby: 'rb',
	rout: 'rconsole',
	r3: 'rebol',
	cw: 'redcode',
	rhtml: 'rhtml',
	rst: 'rst',
	rest: 'rst',
	sass: 'sass',
	scala: 'scala',
	scaml: 'scaml',
	scm: 'scheme',
	scss: 'scss',
	st: 'smalltalk',
	tpl: 'smarty',
	'sources.list': 'sourceslist',
	sql: 'sql',
	'sqlite3-console': 'sqlite3',
	'squid.conf': 'squidconf',
	ssp: 'ssp',
	tcl: 'tcl',
	tcsh: 'tcsh',
	csh: 'tcsh',
	tex: 'tex',
	aux: 'tex',
	toc: 'tex',
	txt: 'text',
	ts: 'typescript',
	v: 'v',
	sv: 'v',
	vala: 'vala',
	vapi: 'vala',
	vb: 'vbnet',
	bas: 'vbnet',
	vm: 'velocity',
	fhtml: 'velocity',
	vim: 'vim',
	vimrc: 'vim',
	xml: 'xml',
	rss: 'xml',
	xsd: 'xml',
	wsdl: 'xml',
	xqy: 'xquery',
	xquery: 'xquery',
	xsl: 'xslt',
	xslt: 'xslt',
	yaml: 'yaml',
	yml: 'yaml'
};

function getLanguage(relativePath: string): string {
	const fileExtension = relativePath.split('.').pop() || '';
	if (fileExtension in languageMap) {
		return languageMap[fileExtension];
	} else {
		return '';
	}
}
