import { testSuite, expect } from 'manten';
import { parseRequest } from '../../src/utils.js';

export default testSuite(({ describe }) => {
	describe('parseRequest', ({ test }) => {
		test('demoId only', () => {
			const result = parseRequest('doc:Hello.vue');
			expect(result.mdFile).toBe(undefined);
			expect(result.demoId).toBe('Hello.vue');
		});

		test('Unix path with demoId', () => {
			const result = parseRequest('doc:/path/to/file.md:Demo');
			expect(result.mdFile).toBe('/path/to/file.md');
			expect(result.demoId).toBe('Demo');
		});

		test('Windows path with demoId', () => {
			const result = parseRequest('doc:C:/path/to/file.md:Demo');
			expect(result.mdFile).toBe('C:/path/to/file.md');
			expect(result.demoId).toBe('Demo');
		});

		test('Windows path with backslashes', () => {
			const result = parseRequest('doc:C:\\path\\to\\file.md:Demo');
			expect(result.mdFile).toBe('C:\\path\\to\\file.md');
			expect(result.demoId).toBe('Demo');
		});

		test('demoId with colon', () => {
			const result = parseRequest('doc:file.md:Demo:v2');
			expect(result.mdFile).toBe('file.md');
			expect(result.demoId).toBe('Demo:v2');
		});

		test('path without protocol', () => {
			const result = parseRequest('C:/path/to/file.md');
			expect(result.mdFile).toBe('C:/path/to/file.md');
			expect(result.demoId).toBe(undefined);
		});

		test('query string preserved', () => {
			const result = parseRequest('doc:Demo.vue?raw');
			expect(result.demoId).toBe('Demo.vue');
			expect(result.query.has('raw')).toBe(true);
		});
	});
});
