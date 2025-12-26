import type { FilterPattern } from 'vite';
import type MarkdownIt from 'markdown-it';
import type { Options as MarkdownItOptions } from 'markdown-it';

export type ImportComponents = Map<string, {
	default?: string;
	named?: Set<string>;
}>;

type DemoNamed = {
	id: string;
	code: string;
};

type DemoEntry = DemoNamed & {
	name: string;
	placeholder: string;
};

export type Demos = Map<string, DemoNamed | DemoEntry>;

export type DemoUtils = {
	registerComponent: (
		componentName: string | string[],
		path: string,
	) => void;
	escapeHtml: (html: string) => string;
};

export type Options = {
	include?: FilterPattern;
	exclude?: FilterPattern;

	markdownItOptions?: MarkdownItOptions;
	markdownItSetup?: (md: MarkdownIt) => void;

	onDemo?: (
		this: DemoUtils,
		tag: string,
		code: string,
		relatedDemos: Demos,
	) => string;

	wrapperClass?: string;
	useVOnce?: boolean;
	markdownCss?: string;
};
