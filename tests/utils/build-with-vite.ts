import { setTimeout } from 'timers/promises';
import path from 'path';
import fs from 'fs/promises';
import { build } from 'vite';
import vuePlugin from '@vitejs/plugin-vue';
import vueMd, { type Options } from '#vite-vue-md';

export const buildWithVite = async (
	fixturePath: string,
	options?: Options,
) => {
	let files = await fs.readdir(fixturePath);
	files = files.filter(file => file.endsWith('.md'));

	await fs.symlink(
		path.resolve('node_modules'),
		path.join(fixturePath, 'node_modules'),
	);

	await build({
		root: fixturePath,

		configFile: false,
		envFile: false,
		logLevel: 'silent',

		plugins: [
			vuePlugin({
				include: [/\.vue$/, /\.md$/],
			}),
			vueMd(options),
		],

		build: {
			outDir: 'dist',
			rollupOptions: {
				external: ['vue'],
			},

			lib: {
				entry: files.map(file => path.join(fixturePath, file)),
				formats: ['es'],
			},
		},
	});

	// Loading seems to be happening before write is complete
	// tsx detects file change and reloads watcher
	await setTimeout(10);

	const componentsEntries = await Promise.all(
		files.map(async (file) => {
			const name = file.slice(0, -3);
			const filePath = path.join(fixturePath, 'dist', `${name}.mjs`);
			const module = await import(filePath);
			return [name, module.default];
		}),
	);

	return Object.fromEntries(componentsEntries);
};
