import type { ImportComponents, Options, Demos } from './types';

export const pluginName = 'vue-md';

export const protocol = 'doc:';

/**
 * Parse request ID - skips Windows drive letter colon (C:/) when finding delimiter
 * - 'doc:Hello.vue' -> { mdFile: undefined, demoId: 'Hello.vue' }
 * - 'doc:C:/path/file.md:Demo' -> { mdFile: 'C:/path/file.md', demoId: 'Demo' }
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
		const withoutPrefix = requestSpecifier.slice(protocol.length);
		const searchStart = /^[A-Z]:/i.test(withoutPrefix) ? 2 : 0;
		const colonIndex = withoutPrefix.indexOf(':', searchStart);

		if (colonIndex === -1) {
			demoId = withoutPrefix;
			mdFile = undefined;
		} else {
			mdFile = withoutPrefix.slice(0, colonIndex);
			demoId = withoutPrefix.slice(colonIndex + 1);
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

			const importParts: string[] = [];
			if (imports.default) {
				importParts.push(imports.default);
			}
			if (imports.named) {
				importParts.push(`{${Array.from(imports.named).join(',')}}`);
			}
			return `import ${importParts.join(',')} from ${JSON.stringify(source)};`;
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
	filePath: string,
): Demos => new Map(
	Array.from(code.matchAll(demoImportPattern))
		.flatMap((match) => {
			const demoName = match[2];
			if (!demoName) {
				return [];
			}
			const demoCode = demos.get(demoName);
			if (!demoCode) {
				throw new Error(`[${pluginName}] Demo ${JSON.stringify(`doc:${demoName}`)} not found in ${filePath}`);
			}
			return [
				[demoName, demoCode],
				...extractDemoImports(demoCode.code, demos, filePath),
			];
		}),
);
