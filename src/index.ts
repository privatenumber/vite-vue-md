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
	DemoImports,
	Demos,
	DemoUtils,
	Options,
} from './types.js';
import { markdownitDemoBlocks } from './demo-blocks.js';

const vueMd = (
	options?: Options,
): Plugin => {
	const filter = createFilter(
		options?.include ?? /\.md$/,
		options?.exclude,
	);
	let demosByFile: Map<string, Demos>;

	return {
		name: pluginName,

		enforce: 'pre',

		buildStart() {
			demosByFile = new Map();
		},

		// Resolve imports from doc demos to the include the actual MD file
		resolveId(requestId, fromId) {
			if (!fromId) {
				return;
			}

			// Resolve relative paths from the virtual file
			if (
				fromId.startsWith(protocol)
				&& requestId[0] === '.'
			) {
				const { mdFile } = parseRequest(fromId);
				return this.resolve(requestId, mdFile);
			}

			if (!requestId.startsWith(protocol)) {
				return;
			}

			const { mdFile, demoId } = parseRequest(requestId);
			if (mdFile) {
				return requestId;
			}

			const from = parseRequest(fromId);
			if (demosByFile.has(from.mdFile!)) {
				return `${protocol}${from.mdFile}:${demoId}`;
			}
		},

		// Load the demo snippet
		load(requestId) {
			if (!requestId.startsWith(protocol)) {
				return;
			}

			const { mdFile, demoId, query } = parseRequest(requestId);
			if (query.has('vue')) {
				return;
			}

			const demos = demosByFile.get(mdFile!);
			if (demos) {
				const demo = demos.get(demoId!);
				if (demo) {
					return demo;
				}
				throw new Error(`[${pluginName}] Demo ${JSON.stringify(`doc:${demoId}`)} not found in ${mdFile}`);
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
			demosByFile.set(mdFile!, demos);

			const demoImports: DemoImports = [];
			mdi.use(
				markdownitDemoBlocks,
				mdFile,
				demos,
				demoImports,
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

			demoImports.forEach((demo) => {
				importComponents.set(`${protocol}${mdFile}:${demo.source}`, {
					default: demo.name,
				});

				let inlineCode = `<${demo.name} />`;
				if (options?.onDemo) {
					const demoCode = demos.get(demo.source)!;
					const relatedDemos = extractDemoImports(demoCode, demos);
					inlineCode = options.onDemo.call(
						utils,
						inlineCode,
						demoCode,
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
