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
				'multi-components': {
					'index.js': `
					export { default as CompA } from './CompA.vue';
					export { default as CompB } from './CompB.vue';
					`,
					'CompA.vue': '<template><div>CompA</div></template>',
					'CompB.vue': '<template><div>CompB</div></template>',
				},
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path, {
				onDemo(componentTag, code) {
					// Default import
					this.registerComponent('Wrapper', './Wrapper.vue');

					// Can do named imports too
					this.registerComponent(['CompA', 'CompB'], './multi-components/index.js');
					return `<Wrapper>${componentTag}<code><template v-pre>${this.escapeHtml(code)}</template></code></Wrapper><CompA /><CompB />`;
				},
			});

			const wrapper = mount(components.doc);
			expect(wrapper.html()).toContain('<div> WRAPPER <div>Hello</div><code><template><template> <div>Hello</div> </template> </template></code></div>\n  <div>CompA</div>\n  <div>CompB</div>');
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

			test('error on missing demo', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'doc.md': outdent`
					\`\`\`vue demo
					<script setup>
					import Missing from 'doc:Missing.vue';
					</script>
					<template>
						<Missing />
					</template>
					\`\`\`
					`,
				});
				onTestFinish(() => fixture.rm());
				expect(() => buildWithVite(fixture.path)).rejects.toThrow('[vue-md] Demo "doc:Missing.vue" not found in /');
			});

			test('error on duplicate demo', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'doc.md': outdent`
					\`\`\`vue demo=a.js
					console.log(1)
					\`\`\`

					\`\`\`vue demo=a.js
					console.log(2)
					\`\`\`
					`,
				});
				onTestFinish(() => fixture.rm());
				expect(() => buildWithVite(fixture.path)).rejects.toThrow('[vue-md] Demo name "a.js" is already used in /');
			});

			test('error on non-vue demo entry', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'doc.md': outdent`
					\`\`\`js demo
					console.log(1)
					\`\`\`
					`,
				});
				onTestFinish(() => fixture.rm());
				expect(() => buildWithVite(fixture.path)).rejects.toThrow('[vue-md] Entry (unnamed) demo must be a Vue component in /');
			});
		});
	});
});
