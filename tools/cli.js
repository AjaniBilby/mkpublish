#!/usr/bin/env node
"use strict";

const shiki = require('shiki');
const path = require('path');
const fs = require('fs');


let config = {
	entry: "index.md",
	output: "index.html",

	theme: "academic",

	code: {
		theme: 'monokai',
		languages: [

		].map(x => x.relative(__dirname, x))
	},
	styles: [],

	mathjax: true,
	mermaid: {
		enabled: false,
		'mermaid-theme': 'forest'
	},
	footnotes: false
};


function CopyObjectValue_ByKeys(from, to, keys) {
	for (let key in keys) {
		to[key] = from[key] || to[key];
	}

	return to;
}


let args = process.argv.slice(2);
if (args.length > 1) {
	console.error("Supplied too many arguments");
	process.exit(1);
} else if (args.length == 1) {
	config.entry = args[0];
	config.output = path.basename(args[0], path.extname(args[0])) + ".html";
} else {
	if (!fs.existsSync('mkpub.json')) {
		console.error("Missing configuration file mkpub.json");
		process.exit(1);
	}

	let custom = JSON.parse(fs.readFileSync('mkpub.json'));
	CopyObjectValue_ByKeys(custom, config, ['entry', 'output', 'theme', 'mathjax', 'footnotes']);

	if (custom.styles) {
		config.styles = custom.styles || [];
	}

	if (custom.code) {
		config.code.theme = custom.code.theme || config.code.theme;
		config.code.languages.concat(custom.code.languages || []);
	}

	if (custom.mermaid) {
		CopyObjectValue_ByKeys(custom.mermaid, config.mermaid, ['enabled', 'mermaid-theme']);
	}
}


shiki.getHighlighter({
	theme: config.code.theme,
	langs: config.code.languages.concat(shiki.BUNDLED_LANGUAGES)
}).then((highlighter) => {
	var md = require('markdown-it')({
		html: true,
		xhtmlOut: true,

		typographer: true,
		quotes: '“”‘’',

		highlight: (code, lang) => {
			return highlighter.codeToHtml(code, {lang});
		}
	});
	if (config.mathjax) {
		md.use(require('markdown-it-mathjax'));
	}
	if (config.mermaid.enabled) {
		md.use(require('markdown-it-mermaid'));
		md.mermaid.loadPreferences({
			get: key => {
				return config.mermaid[key];
			}
		});
	}
	if (config.footnotes) {
		md.use(require('markdown-it-footnote'));
	}

	let input = fs.readFileSync(config.entry, 'utf-8');

	let body = md.render(input);
	let doc = `<!DOCTYPE html><html>\n` +
		`<meta charset="UTF-8">\n` +
		`<body>\n` +
		body +
		`</body></html>`;
	fs.writeFileSync(config.output, doc);
	console.log(`Saved document "${path.basename(config.output)}" to:`);
	console.log(" ", path.resolve(path.dirname(config.output)));
});