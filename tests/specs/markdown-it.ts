import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import mdAnchor from 'markdown-it-anchor';
import { buildWithVite } from '../utils/build-with-vite.js';
import { mount } from '../utils/vue-mount.js';

export default testSuite(({ describe }) => {
	describe('markdown-it', ({ test }) => {
		test('options', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'doc.md': outdent`
				\`\`\`vue
				a
				\`\`\`
				`,
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path, {
				markdownItOptions: {
					langPrefix: 'asdf-',
				},
			});
			const wrapper = mount(components.doc);
			expect(wrapper.html()).toContain('<code class="asdf-vue">');
		});

		test('setup', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'doc.md': '# Hello World',
			});
			onTestFinish(() => fixture.rm());

			const components = await buildWithVite(fixture.path, {
				markdownItSetup(md) {
					md.use(mdAnchor);
				},
			});
			const wrapper = mount(components.doc);
			expect(wrapper.html()).toContain('<h1 id="hello-world" tabindex="-1">Hello World</h1>');
		});
	});
});
