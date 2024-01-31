import markdownIt from 'markdown-it';
import type { Demos } from './types.js';
import { protocol, pluginName } from './utils.js';

export const markdownitDemoBlocks: markdownIt.PluginWithParams = (
	md,
	filePath: string,
	demos: Demos,
) => {
	const defaultFence = md.renderer.rules.fence!;
	md.renderer.rules.fence = function (tokens, index, mdOptions, env, self) {
		const token = tokens[index]!;
		const [language, isDemo] = token.info.trim().split(/\s+/, 2);

		if (!isDemo || !isDemo.startsWith('demo')) {
			let code = defaultFence.call(this, tokens, index, mdOptions, env, self);
			code = code.replaceAll('<pre', '<pre v-pre');
			return code;
		}

		let [, demoName] = isDemo.split('=', 2);
		if (demoName) {
			if (demos!.has(demoName)) {
				throw new Error(`[${pluginName}] Demo name ${JSON.stringify(demoName)} is already used in ${filePath}`);
			}

			demos!.set(demoName, {
				id: `${protocol}${filePath}:${demoName}`,
				code: token.content,
			});
			return '';
		}

		if (language !== 'vue') {
			throw new Error(`[${pluginName}] Entry (unnamed) demo must be a Vue component in ${filePath}`);
		}

		const demoId = demos!.size + 1;
		demoName = `Demo${demoId}`;

		const fileName = `${demoName}.${language}`;

		// Wait for all demos to be gathered in case the onDemo callback
		// needs to group them together
		const placeholder = `\0${Math.random().toString(36)}\0`;

		// Filename is not the full internal path because it's used in the
		// onDemo hook for users
		demos.set(fileName, {
			id: `${protocol}${filePath}:${fileName}`,
			name: demoName,
			placeholder,
			code: token.content,
		});

		return placeholder;
	};
};
