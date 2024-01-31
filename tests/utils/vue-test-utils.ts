/**
 * This file registers happy-dom globally before loading Vue.js
 * This is necessary as a separate file because ESLint reoders imports
 */
import './happy-dom.js';

export * from '@vue/test-utils';
