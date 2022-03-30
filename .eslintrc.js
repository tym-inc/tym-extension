/**@type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	rules: {
		"@typescript-eslint/naming-convention": "warn",
		"@typescript-eslint/semi": "warn",
		"eqeqeq": "warn",
		"no-throw-literal": "warn",
		"semi": "off",
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": [
			'warn', // or error
			{ 
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
			},
		],
	},
	ignorePatterns: ["**/*.d.ts"]
};
