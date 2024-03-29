import type { FilterPattern } from 'vite';
import markdownIt from 'markdown-it';

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

	markdownItOptions?: markdownIt.Options;
	markdownItSetup?: (md: markdownIt) => void;

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
