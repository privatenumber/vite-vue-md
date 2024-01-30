import markdownIt from 'markdown-it';
import type { DemoImports, Demos } from './types.js';
import { pluginName } from './utils.js';

export const markdownitDemoBlocks: markdownIt.PluginWithParams = (
	md,
	filePath: string,
	demos: Demos,
	importedDemos: DemoImports,
) => {
	const defaultFence = md.renderer.rules.fence!;
	md.renderer.rules.fence = function (tokens, index, mdOptions, env, self) {
		const token = tokens[index]!;
		const [language, isDemo] = token.info.trim().split(/\s+/, 2);

		if (!isDemo || !isDemo.startsWith('demo')) {
			if (!mdOptions.highlight) {
				mdOptions = {
					...mdOptions,
					highlight: content => `<template v-pre>${md.utils.escapeHtml(content)}</template>`,
				};
			}

			return defaultFence.call(this, tokens, index, mdOptions, env, self);
		}

		let [, demoName] = isDemo.split('=', 2);
		if (demoName) {
			if (demos!.has(demoName)) {
				throw new Error(`[${pluginName}] Demo name ${JSON.stringify(demoName)} is already used in ${filePath}`);
			}

			demos!.set(demoName, token.content);
			return '';
		}

		if (language !== 'vue') {
			throw new Error(`[${pluginName}] Entry (unnamed) demo must be a Vue component in ${filePath}`);
		}

		const demoId = demos!.size + 1;
		demoName = `Demo${demoId}`;

		const source = `${demoName}.${language}`;
		demos!.set(source, token.content);

		// Wait for all demos to be gathered in case the onDemo callback
		// needs to group them together
		const placeholder = `\0${Math.random().toString(36)}\0`;

		// Source is not the full internal path because it's used in the
		// onDemo hook for users
		importedDemos.push({
			source,
			name: demoName,
			placeholder,
		});
		return placeholder;
	};
};
