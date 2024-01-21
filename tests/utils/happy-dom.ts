import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Since happy dom hijacks console
export const { console } = globalThis;

GlobalRegistrator.register();
