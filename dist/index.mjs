import markdownIt from 'markdown-it';
import { createFilter } from 'vite';

const pluginName = "vue-md";
const protocol = "doc:";
const parseRequest = (requestId) => {
  const [requestSpecifier, queryString] = requestId.split("?", 2);
  const query = new URLSearchParams(queryString);
  let mdFile = requestSpecifier;
  let demoId;
  if (requestSpecifier?.startsWith(protocol)) {
    [mdFile, demoId] = requestSpecifier.slice(protocol.length).split(":", 2);
    if (!demoId) {
      demoId = mdFile;
      mdFile = void 0;
    }
  }
  return {
    mdFile,
    demoId,
    query
  };
};
const renderVueComponent = (markdownHtml, components, {
  wrapperClass,
  useVOnce,
  markdownCss
} = {}) => {
  let content = `
	<template>
		<div
			class=${JSON.stringify(wrapperClass ?? "markdown-body")}
			${useVOnce ? "v-once" : ""}
		>${markdownHtml}</div>
	</template>
	`;
  if (components.size > 0) {
    const registerComponents = [];
    const importStatements = Array.from(components).map(([source, imports]) => {
      if (imports.default) {
        registerComponents.push(imports.default);
      }
      if (imports.named) {
        registerComponents.push(...imports.named);
      }
      return `import ${[
        imports.default,
        imports.named ? `{${Array.from(imports.named).join(",")}}` : ""
      ].filter(Boolean).join(",")} from ${JSON.stringify(source)};`;
    }).join("");
    content += `
		<script>
		${importStatements}
		export default { components: { ${registerComponents.join(",")} } }
		<\/script>`;
  }
  if (markdownCss) {
    content += `
<style scoped src="${markdownCss}" />`;
  }
  return content;
};
const demoImportPattern = /(["'])doc:(.+)\1/g;
const extractDemoImports = (code, demos) => new Map(
  Array.from(code.matchAll(demoImportPattern)).flatMap((match) => {
    const demoName = match[2];
    const demoCode = demos.get(demoName);
    return [[demoName, demoCode], ...extractDemoImports(demoCode, demos)];
  })
);

const markdownitDemoBlocks = (md, filePath, demos, importedDemos) => {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = function(tokens, index, mdOptions, env, self) {
    const token = tokens[index];
    const [language, isDemo] = token.info.trim().split(/\s+/, 2);
    if (!isDemo || !isDemo.startsWith("demo")) {
      if (!mdOptions.highlight) {
        mdOptions = {
          ...mdOptions,
          highlight: (content) => `<template v-pre>${md.utils.escapeHtml(content)}</template>`
        };
      }
      return defaultFence.call(this, tokens, index, mdOptions, env, self);
    }
    let [, demoName] = isDemo.split("=", 2);
    if (demoName) {
      if (demos.has(demoName)) {
        throw new Error(`[${pluginName}] Demo name ${JSON.stringify(demoName)} is already used in ${filePath}`);
      }
      demos.set(demoName, token.content);
      return "";
    }
    if (language !== "vue") {
      throw new Error(`[${pluginName}] Entry (unnamed) demo must be a Vue component in ${filePath}`);
    }
    const demoId = demos.size + 1;
    demoName = `Demo${demoId}`;
    const source = `${demoName}.${language}`;
    demos.set(source, token.content);
    const placeholder = `\0${Math.random().toString(36)}\0`;
    importedDemos.push({
      source,
      name: demoName,
      placeholder
    });
    return placeholder;
  };
};

const vueMd = (options) => {
  const filter = createFilter(
    options?.include ?? /\.md$/,
    options?.exclude
  );
  let demosByFile;
  return {
    name: pluginName,
    enforce: "pre",
    buildStart() {
      demosByFile = /* @__PURE__ */ new Map();
    },
    // Resolve imports from doc demos to the include the actual MD file
    resolveId(requestId, fromId) {
      if (!fromId || !requestId.startsWith(protocol)) {
        return;
      }
      const { mdFile, demoId } = parseRequest(requestId);
      if (mdFile) {
        return requestId;
      }
      const from = parseRequest(fromId);
      if (demosByFile.has(from.mdFile)) {
        return `${protocol}${from.mdFile}:${demoId}`;
      }
    },
    // Load the demo snippet
    load(requestId) {
      if (!requestId.startsWith(protocol)) {
        return;
      }
      const { mdFile, demoId, query } = parseRequest(requestId);
      if (query.has("vue")) {
        return;
      }
      const demos = demosByFile.get(mdFile);
      if (demos) {
        const demo = demos.get(demoId);
        if (demo) {
          return demo;
        }
        throw new Error(`[${pluginName}] Demo ${JSON.stringify(`doc:${demoId}`)} not found in ${mdFile}`);
      }
    },
    // Transform the Markdown file to Vue
    transform(code, requestId) {
      if (requestId.startsWith(protocol) || !filter(requestId)) {
        return;
      }
      const mdi = markdownIt(options?.markdownItOptions ?? {});
      if (options?.markdownItSetup) {
        options.markdownItSetup(mdi);
      }
      const { mdFile } = parseRequest(requestId);
      const demos = /* @__PURE__ */ new Map();
      demosByFile.set(mdFile, demos);
      const demoImports = [];
      mdi.use(
        markdownitDemoBlocks,
        mdFile,
        demos,
        demoImports
      );
      let markdownHtml = mdi.render(code);
      const importComponents = /* @__PURE__ */ new Map();
      const utils = {
        registerComponent(componentName, importFrom) {
          let importFromFile = importComponents.get(importFrom);
          if (!importFromFile) {
            importFromFile = {
              named: /* @__PURE__ */ new Set()
            };
            importComponents.set(importFrom, importFromFile);
          }
          if (Array.isArray(componentName)) {
            componentName.forEach((name) => importFromFile.named.add(name));
          } else {
            importFromFile.default = componentName;
          }
        },
        escapeHtml: mdi.utils.escapeHtml
      };
      demoImports.forEach((demo) => {
        importComponents.set(`${protocol}${mdFile}:${demo.source}`, {
          default: demo.name
        });
        let inlineCode = `<${demo.name} />`;
        if (options?.onDemo) {
          const demoCode = demos.get(demo.source);
          const relatedDemos = extractDemoImports(demoCode, demos);
          inlineCode = options.onDemo.call(
            utils,
            inlineCode,
            demoCode,
            relatedDemos
          );
        }
        markdownHtml = markdownHtml.replace(
          demo.placeholder,
          inlineCode
        );
      });
      return renderVueComponent(
        markdownHtml,
        importComponents,
        options
      );
    }
  };
};

export { vueMd as default };
