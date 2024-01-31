import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueMd from '#vite-vue-md';

export default defineConfig({
	plugins: [
		vueMd(),
		vue({
			include: ['**/*.vue', '**/*.md'],
		}),
	],
});
