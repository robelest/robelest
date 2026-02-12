import { Marked } from 'marked';
import katex from 'katex';

// Create a new Marked instance with custom configuration
const marked = new Marked();

// KaTeX rendering for math expressions
// Inline math: $...$
// Block math: $$...$$
function renderMath(tex: string, displayMode: boolean): string {
	try {
		return katex.renderToString(tex, {
			displayMode,
			throwOnError: false,
			trust: true,
		});
	} catch (e) {
		console.error('KaTeX error:', e);
		return `<span class="katex-error">${tex}</span>`;
	}
}

// Custom tokenizer extensions for math
const mathExtension = {
	name: 'math',
	level: 'inline' as const,
	start(src: string) {
		return src.indexOf('$');
	},
	tokenizer(src: string) {
		// Block math: $$...$$
		const blockMatch = src.match(/^\$\$([\s\S]+?)\$\$/);
		if (blockMatch) {
			return {
				type: 'math',
				raw: blockMatch[0],
				text: blockMatch[1].trim(),
				displayMode: true,
			};
		}
		// Inline math: $...$
		const inlineMatch = src.match(/^\$([^\$\n]+?)\$/);
		if (inlineMatch) {
			return {
				type: 'math',
				raw: inlineMatch[0],
				text: inlineMatch[1].trim(),
				displayMode: false,
			};
		}
		return undefined;
	},
	renderer(token: { text: string; displayMode: boolean }) {
		return renderMath(token.text, token.displayMode);
	},
};

// Custom renderer for mermaid code blocks
// Note: marked v17+ passes token objects, not individual parameters
const renderer = {
	code(token: { text: string; lang?: string }): string {
		const { text, lang } = token;
		if (lang === 'mermaid') {
			// Return pre tag with mermaid class - will be rendered client-side
			return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
		}
		// Default code block rendering with syntax highlighting classes
		const langClass = lang ? ` class="language-${lang}"` : '';
		return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>`;
	},
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

// Configure marked with extensions
marked.use({
	extensions: [mathExtension],
	renderer,
	gfm: true,
	breaks: false,
});

export function renderMarkdown(content: string): string {
	return marked.parse(content) as string;
}

export { marked };
