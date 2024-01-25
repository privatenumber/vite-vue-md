import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import { buildWithVite } from '../utils/build-with-vite.js';
import { mount } from '../utils/vue-mount.js';

export default testSuite(({ describe }) => {
	describe('demo blocks', ({ test, describe }) => {
		test('inline renders', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'doc.md': outdent`
				\`\`\`vue demo
				<script setup>
				const value = 123;
				</script>
				<template>
				  <div>Output {{ value }}</div>
				</template>
				\`\`\`
				`,
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path);
			const wrapper = mount(components.doc);
			expect(wrapper.html()).toContain('<div>Output 123</div>');
		});

		test('multi file & doesnt mix imports across files', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'docA.md': outdent`
				\`\`\`vue demo
				<script setup>
				import Hello from 'doc:Hello.vue';
				import { value } from 'doc:values.js';
				</script>
				<template>
					<Hello />
					<div>Output {{ value }}</div>
				</template>
				\`\`\`
				\`\`\`vue demo=Hello.vue
				<template>
				  <span>Hello A</span>
				</template>
				\`\`\`
				\`\`\`js demo=values.js
				export const value = 123
				\`\`\`
				`,
				'docB.md': outdent`
				\`\`\`vue demo
				<script setup>
				import Hello from 'doc:Hello.vue';
				import { value } from 'doc:values.js';
				</script>
				<template>
					<Hello />
					<div>Output {{ value }}</div>
				</template>
				\`\`\`
				\`\`\`vue demo=Hello.vue
				<template>
				  <span>Hello B</span>
				</template>
				\`\`\`
				\`\`\`js demo=values.js
				export const value = 321
				\`\`\`
				`,
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path);

			const wrapperA = mount(components.docA);
			expect(wrapperA.html()).toBe(outdent`
			<div class="markdown-body"><span>Hello A</span>
			  <div>Output 123</div>
			</div>
			`);

			const wrapperB = mount(components.docB);
			expect(wrapperB.html()).toBe(outdent`
			<div class="markdown-body"><span>Hello B</span>
			  <div>Output 321</div>
			</div>
			`);
		});

		test('onDemo', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'doc.md': outdent`
				\`\`\`vue demo
				<template>
					<div>Hello</div>
				</template>
				\`\`\`

				\`\`\`vue demo
				<template>
					<div>Goodbye</div>
				</template>
				\`\`\`
				`,
				'Wrapper.vue': `
				<template>
					<div>
					WRAPPER
					<slot />
					</div>
				</template>
				`,
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path, {
				onDemo(componentTag, code) {
					this.registerComponent('Wrapper', './Wrapper.vue');
					return `<Wrapper>${componentTag}<code><template v-pre>${this.escapeHtml(code)}</template></code></Wrapper>`;
				},
			});

			const wrapper = mount(components.doc);
			expect(wrapper.html()).toContain('<div> WRAPPER <div>Hello</div><code><template><template> <div>Hello</div> </template> </template></code></div>');
		});

		describe('error cases', ({ test }) => {
			test('ignores non-demo annotations', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'doc.md': outdent`
					\`\`\`vue RANDOM
					<script setup>
					const value = 123;
					</script>
					<template>
					  <div>Output {{ value }}</div>
					</template>
					\`\`\`
					`,
				});
				onTestFinish(() => fixture.rm());

				const components = await buildWithVite(fixture.path);
				const wrapper = mount(components.doc);
				expect(wrapper.html()).toContain('<code class="language-vue">');
			});
		});
	});
});