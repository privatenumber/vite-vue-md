import { createFilter, type Plugin } from 'vite';
import {
	pluginName,
	protocol,
	parseRequest,
} from './utils.js';
import type { Options } from './types.js';
import { mdToFiles } from './md-to-files.js';

const vueMd = (
	options?: Options,
): Plugin => {
	const filter = createFilter(
		options?.include ?? '**/*.md',
		options?.exclude,
	);
	let cachedFiles: Map<string, string>;

	return {
		name: pluginName,

		enforce: 'pre',

		buildStart: () => {
			cachedFiles = new Map();
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
			if (cachedFiles.has(requestId)) {
				return requestId;
			}

			const { demoId, query } = parseRequest(requestId);

			// Internal Vue path like script
			if (query.has('vue')) {
				return requestId;
			}

			const resolvedId = `${protocol}${from.mdFile}:${demoId}`;
			if (cachedFiles.has(resolvedId)) {
				return resolvedId;
			}

			throw new Error(`[${pluginName}] Demo ${JSON.stringify(`doc:${demoId}`)} not found in ${from.mdFile}`);
		},

		// Load the demo snippet
		load: (requestId) => {
			if (requestId.startsWith(protocol)) {
				return cachedFiles.get(requestId);
			}
		},

		// Transform the Markdown file to Vue
		transform: (mdCode, mdId) => {
			if (!filter(mdId)) {
				return;
			}
			const files = mdToFiles(mdCode, mdId, options);

			// Update cache
			files.forEach((code, id) => cachedFiles.set(id, code));

			return files.get(mdId);
		},

		handleHotUpdate: async (context) => {
			if (!filter(context.file)) {
				return;
			}

			const mdCode = await context.read();
			const files = mdToFiles(mdCode, context.file, options);
			const changedModules = Array.from(files).map(([id, newCode]) => {
				const oldCode = cachedFiles.get(id);
				if (oldCode === newCode) {
					return undefined;
				}

				// Update cache
				cachedFiles.set(id, newCode);

				const module = context.server.moduleGraph.getModuleById(id);
				if (module) {
					/**
					 * Not completely sure why this is necessary, but it seems
					 * to be the only way to get it to work
					 *
					 * Without it, after editing a virtual module, the document
					 * MD is no longer updatable
					 */
					context.server.reloadModule(module);
				}
				return module;
			});

			return changedModules.filter(Boolean);
		},
	};
};

export default vueMd;
export { Options };
