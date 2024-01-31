import type { ImportComponents, Options, Demos } from './types';

export const pluginName = 'vue-md';

export const protocol = 'doc:';

export const parseRequest = (
	requestId: string,
) => {
	const [requestSpecifier, queryString] = requestId.split('?', 2);
	const query = new URLSearchParams(queryString);
	let mdFile: string | undefined = requestSpecifier;
	let demoId: string | undefined;

	if (requestSpecifier?.startsWith(protocol)) {
		[mdFile, demoId] = requestSpecifier.slice(protocol.length).split(':', 2);
		if (!demoId) {
			demoId = mdFile;
			mdFile = undefined;
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
