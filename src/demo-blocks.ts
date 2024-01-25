import markdownIt from 'markdown-it';
import type { Components, Demos } from './types';

export const markdownitDemoBlocks: markdownIt.PluginWithParams = (
	md,
	demos: Demos,
	components: Components[],
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

		let [, demoName] = isDemo.split('=');
		if (demoName) {
			demos!.set(demoName, token.content);
			return '';
		}

		const demoId = demos!.size + 1;
		demoName = `Demo${demoId}`;

		const source = `${demoName}.${language}`;
		demos!.set(source, token.content);

		// Wait for all demos to be gathered in case the onDemo callback
		// needs to group them together
		const placeholder = `\0${Math.random().toString(36)}\0`;
		components.push({
			placeholder,
			name: demoName,
			source,
		});
		return placeholder;
	};
};
