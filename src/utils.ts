import type { Components, Options } from './types';

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
	components: Components[],
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

	// Uniquify by name
	components = components.filter((component, index, self) => {
		const firstIndex = self.findIndex(({ name }) => name === component.name);
		return firstIndex === index;
	});

	if (components.length > 0) {
		content += `
		<script>
		${components.map(({ name, source }) => `import ${name} from ${JSON.stringify(source)}`).join(';')}
		export default { components: { ${components.map(({ name }) => name).join(',')} } }
		</script>`;
	}

	if (markdownCss) {
		content += `\n<style scoped src="${markdownCss}" />`;
	}

	return content;
};
