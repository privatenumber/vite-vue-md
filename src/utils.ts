import type { ImportComponents, Options, Demos } from './types';

export const pluginName = 'vue-md';

export const protocol = 'doc:';

/**
 * Parse a request ID into its components, handles various formats:
 * - 'doc:Hello.vue' -> { mdFile: undefined, demoId: 'Hello.vue' }
 * - 'doc:C:/path/file.md:Demo' -> { mdFile: 'C:/path/file.md', demoId: 'Demo' }
 * - 'doc:file://C:/path/file.md:Demo' -> { mdFile: 'file://C:/path/file.md', demoId: 'Demo' }
 * - 'C:/path/file.md' -> { mdFile: 'C:/path/file.md', demoId: undefined }
 */
export const parseRequest = (
	requestId: string,
) => {
	const [requestSpecifier, queryString] = requestId.split('?', 2);
	const query = new URLSearchParams(queryString);
	let mdFile: string | undefined = requestSpecifier;
	let demoId: string | undefined;

	if (requestSpecifier?.startsWith(protocol)) {
		// Remove protocol prefix
		const withoutPrefix = requestSpecifier.slice(protocol.length);

		// Find the last colon to split mdFile and demoId
		// This correctly handles Windows paths like C:/path/to/file:demo
		const lastColonIndex = withoutPrefix.lastIndexOf(':');

		if (lastColonIndex === -1) {
			// No colon means just a demoId
			demoId = withoutPrefix;
			mdFile = undefined;
		} else {
			mdFile = withoutPrefix.slice(0, lastColonIndex);
			demoId = withoutPrefix.slice(lastColonIndex + 1);

			if (!demoId) {
				demoId = mdFile;
				mdFile = undefined;
			}
		}
	}

	return {
		mdFile,
		demoId,
		query,
	};
};

export const renderVueComponent = (
	markdownHtml: string,
	components: ImportComponents,
	{
		wrapperClass,
		useVOnce,
		markdownCss,
	}: Options = {},
) => {
	let content = `
	<template>
		<div
			class=${JSON.stringify(wrapperClass ?? 'markdown-body')}
			${useVOnce ? 'v-once' : ''}
		>${markdownHtml}</div>
	</template>
	`;

	if (components.size > 0) {
		const registerComponents: string[] = [];
		const importStatements = Array.from(components).map(([source, imports]) => {
			if (imports.default) {
				registerComponents.push(imports.default);
			}
			if (imports.named) {
				registerComponents.push(...imports.named);
			}

			return `import ${
				[
					imports.default,
					imports.named ? `{${Array.from(imports.named).join(',')}}` : '',
				].filter(Boolean).join(',')
			} from ${JSON.stringify(source)};`;
		}).join('');

		content += `
		<script>
		${importStatements}
		export default { components: { ${registerComponents.join(',')} } }
		</script>`;
	}

	if (markdownCss) {
		content += `\n<style scoped src="${markdownCss}" />`;
	}

	return content;
};

const demoImportPattern = /(["'])doc:(.+)\1/g;
export const extractDemoImports = (
	code: string,
	demos: Demos,
): Demos => new Map(
	Array.from(code.matchAll(demoImportPattern))
		.flatMap((match) => {
			const demoName = match[2]!;
			const demoCode = demos.get(demoName)!;
			return [
				[demoName, demoCode],
				...extractDemoImports(demoCode.code, demos),
			];
		}),
);
