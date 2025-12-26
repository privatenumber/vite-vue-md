import { defineConfig, pvtnbr } from 'lintroll';

export default defineConfig([
	...pvtnbr(),
	{
		files: ['package.json'],
		rules: {
			'package-json/valid-repository': 'off',
		},
	},
]);
