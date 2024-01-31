import { describe, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import { mount } from './utils/vue-test-utils.js';
import { buildWithVite } from './utils/build-with-vite.js';

describe('vite-vue-md', ({ test, runTestSuite }) => {
	test('Markdown builds with Vue code', async ({ onTestFinish }) => {
		const fixture = await createFixture({
			'doc.md': outdent`		
			No language
			\`\`\`
			<template>
			  <div>No language {{ value }}</div>
			</template>
			\`\`\`
	
			Vue language
			\`\`\`vue
			<template>
			  <div>Language {{ value }}</div>
			</template>
			\`\`\`
			`,
		});
		onTestFinish(() => fixture.rm());

		const components = await buildWithVite(fixture.path);
		const wrapper = mount(components.doc);
		expect(wrapper.html()).toContain('<div>No language {{ value }}</div>');
		expect(wrapper.html()).toContain('<div>Language {{ value }}</div>');
	});

	test('wrapperClass', async ({ onTestFinish }) => {
		const fixture = await createFixture({
			'doc.md': '# Hello World',
		});
		onTestFinish(() => fixture.rm());

		const components = await buildWithVite(fixture.path, {
			wrapperClass: 'test',
		});
		const wrapper = mount(components.doc);
		expect(wrapper.html()).toBe(outdent`
		<div class="test">
		  <h1>Hello World</h1>
		</div>
		`);
	});

	test('markdownCss', async ({ onTestFinish }) => {
		const fixture = await createFixture({
			'doc.md': '# Hello World',
			'markdown.css': `
			.markdown-body {
				color: red;
			}
			`,
		});
		onTestFinish(() => fixture.rm());

		const components = await buildWithVite(fixture.path, {
			markdownCss: '/markdown.css',
		});

		const styleCss = await fixture.readFile('./dist/style.css', 'utf8');
		expect(styleCss).toBe('.markdown-body[data-v-0270aa36]{color:red}\n');

		const wrapper = mount(components.doc);
		expect(wrapper.html()).toBe(outdent`
		<div data-v-0270aa36="" class="markdown-body">
		  <h1 data-v-0270aa36="">Hello World</h1>
		</div>
		`);
	});

	runTestSuite(import('./specs/markdown-it.js'));
	runTestSuite(import('./specs/demo-blocks.js'));
});
