import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(global, {
	window,
	document: window.document,
	SVGElement: window.SVGElement,
	Element: window.Element,
});
