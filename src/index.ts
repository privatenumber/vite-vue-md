import markdownIt from 'markdown-it';
import { createFilter, type Plugin } from 'vite';
import { protocol, parseRequest, renderVueComponent } from './utils.js';
import type { Components, Demos, Options } from './types.js';
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
		name: 'vue-md',

		enforce: 'pre',

		buildStart() {
			demosByFile = new Map();
		},

		// Resolve imports from doc demos to the include the actual MD file
		resolveId(requestId, fromId) {
			if (
				!fromId
				|| !requestId.startsWith(protocol)
			) {
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
				return demos.get(demoId!);
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
			let demos = demosByFile.get(mdFile!);
			if (!demos) {
				demos = new Map();
				demosByFile.set(mdFile!, demos);
			}

			const components: Components[] = [];
			mdi.use(markdownitDemoBlocks, demos, components);

			let markdownHtml = mdi.render(code);

			const utils = {
				registerComponent(
					name: string,
					source: string,
				) {
					components.push({
						placeholder: '',
						name,
						source,
					});
				},
				escapeHtml: mdi.utils.escapeHtml,
			};

			const componentsLength = components.length;
			for (let i = 0; i < componentsLength; i += 1) {
				const component = components[i]!;
				let inlineCode = `<${component.name} />`;

				if (options?.onDemo) {
					inlineCode = options.onDemo.call(
						utils,
						inlineCode,
						demos!.get(component.source)!,
						demos!,
					);
				}

				component.source = `${protocol}${mdFile}:${component.source}`;
				markdownHtml = markdownHtml.replace(
					component.placeholder,
					inlineCode,
				);
			}

			return renderVueComponent(
				markdownHtml,
				components,
				options,
			);
		},
	};
};

export default vueMd;
export { Options };
