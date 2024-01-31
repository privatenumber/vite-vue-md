import markdownIt from 'markdown-it';
import { createFilter, type Plugin } from 'vite';
import {
	pluginName,
	protocol,
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

const vueMd = (
	options?: Options,
): Plugin => {
	const filter = createFilter(
		options?.include ?? '**/*.md',
		options?.exclude,
	);
	let compiledFiles: Map<string, string>;

	return {
		name: pluginName,

		enforce: 'pre',

		buildStart() {
			compiledFiles = new Map();
		},

		// Resolve imports from doc demos to the include the actual MD file
		resolveId(requestId, fromId) {
			if (!fromId) {
				return;
			}
			const from = parseRequest(fromId);

			// Resolve relative paths from the virtual file
			if (
				requestId[0] === '.'
				&& fromId.startsWith(protocol)
			) {
				return this.resolve(requestId, from.mdFile);
			}

			if (!requestId.startsWith(protocol)) {
				return;
			}

			// Fully resolved demo path
			if (compiledFiles.has(requestId)) {
				return requestId;
			}

			const { demoId } = parseRequest(requestId);
			const resolvedId = `${protocol}${from.mdFile}:${demoId}`;
			if (compiledFiles.has(resolvedId)) {
				return resolvedId;
			}

			throw new Error(`[${pluginName}] Demo ${JSON.stringify(`doc:${demoId}`)} not found in ${from.mdFile}`);
		},

		// Load the demo snippet
		load(requestId) {
			if (requestId.startsWith(protocol)) {
				return compiledFiles.get(requestId);
			}
		},

		// Transform the Markdown file to Vue
		transform(code, requestId) {
			if (
				requestId.startsWith(protocol)
				|| !filter(requestId)
			) {
				return;
			}

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

			return renderVueComponent(
				markdownHtml,
				importComponents,
				options,
			);
		},
	};
};

export default vueMd;
export { Options };
