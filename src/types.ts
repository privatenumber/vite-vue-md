import type { FilterPattern } from 'vite';
import markdownIt from 'markdown-it';

export type Components = {
	placeholder: string;
	name: string;
	source: string;
};

export type Demos = Map<string, string>;

export type Options = {
	include?: FilterPattern;
	exclude?: FilterPattern;

	markdownItOptions?: markdownIt.Options;
	markdownItSetup?: (md: markdownIt) => void;

	onDemo?: (
		this: {
			registerComponent: (
				componentName: string,
				path: string,
			) => void;
			escapeHtml: (html: string) => string;
		},
		tag: string,
		code: string,
		demos: Demos,
	) => string;

	wrapperClass?: string;
	useVOnce?: boolean;
	markdownCss?: string;
};
