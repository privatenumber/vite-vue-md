import markdownIt from 'markdown-it';
import {
	parseRequest,
	renderVueComponent,
	extractDemoImports,
} from './utils.js';
import type {
	ImportComponents,
	Demos,
	DemoUtils,
	Options,
} from './types.js';
import { markdownitDemoBlocks } from './demo-blocks.js';

export const mdToFiles = (
	code: string,
	requestId: string,
	options?: Options,
) => {
	const mdi = markdownIt(options?.markdownItOptions ?? {});
	if (options?.markdownItSetup) {
		options.markdownItSetup(mdi);
	}

	const { mdFile } = parseRequest(requestId);

	const demos: Demos = new Map();
	mdi.use(
		markdownitDemoBlocks,
		mdFile,
		demos,
	);

	let markdownHtml = mdi.render(code);

	const importComponents: ImportComponents = new Map();
	const utils: DemoUtils = {
		registerComponent(
			componentName,
			importFrom,
		) {
			let importFromFile = importComponents.get(importFrom);
			if (!importFromFile) {
				importFromFile = {
					named: new Set(),
				};
				importComponents.set(importFrom, importFromFile);
			}

			if (Array.isArray(componentName)) {
				componentName.forEach(name => importFromFile.named!.add(name));
			} else {
				importFromFile.default = componentName;
			}
		},
		escapeHtml: mdi.utils.escapeHtml,
	};

	const compiledFiles = new Map<string, string>();
	demos.forEach((demo) => {
		compiledFiles.set(demo.id, demo.code);

		if (!('placeholder' in demo)) {
			return;
		}

		importComponents.set(demo.id, {
			default: demo.name,
		});

		let inlineCode = `<${demo.name} />`;
		if (options?.onDemo) {
			const relatedDemos = extractDemoImports(demo.code, demos);
			inlineCode = options.onDemo.call(
				utils,
				inlineCode,
				demo.code,
				relatedDemos,
			);
		}

		markdownHtml = markdownHtml.replace(
			demo.placeholder,
			inlineCode,
		);
	});

	const vueCode = renderVueComponent(
		markdownHtml,
		importComponents,
		options,
	);

	compiledFiles.set(requestId, vueCode);

	return compiledFiles;
};
