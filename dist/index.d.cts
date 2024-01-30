import { FilterPattern, Plugin } from 'vite';
import markdownIt from 'markdown-it';

type Demos = Map<string, string>;
type DemoUtils = {
    registerComponent: (componentName: string | string[], path: string) => void;
    escapeHtml: (html: string) => string;
};
type Options = {
    include?: FilterPattern;
    exclude?: FilterPattern;
    markdownItOptions?: markdownIt.Options;
    markdownItSetup?: (md: markdownIt) => void;
    onDemo?: (this: DemoUtils, tag: string, code: string, relatedDemos: Demos) => string;
    wrapperClass?: string;
    useVOnce?: boolean;
    markdownCss?: string;
};

declare const vueMd: (options?: Options) => Plugin;

export { type Options, vueMd as default };
