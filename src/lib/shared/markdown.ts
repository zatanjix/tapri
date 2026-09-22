import type { Nodes, PhrasingContent, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmAutolinkLiteralFromMarkdown } from 'mdast-util-gfm-autolink-literal';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { mathFromMarkdown } from 'mdast-util-math';
import { gfmAutolinkLiteral } from 'micromark-extension-gfm-autolink-literal';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { math } from 'micromark-extension-math';
import temml from 'temml';

/**
 * Tapri's markdown: a small tree of allowed node types only, rendered by Svelte components.
 * Nothing in it is HTML except `math.html`, which only Temml produces (and which is checked).
 */
export type Inline =
	| { t: 'text'; v: string }
	| { t: 'br' }
	| { t: 'strong' | 'em' | 'del'; c: Inline[] }
	| { t: 'code'; v: string }
	| { t: 'link'; href: string; c: Inline[] }
	| { t: 'math'; html: string };

export type Block =
	| { t: 'p'; c: Inline[] }
	| { t: 'quote'; c: Block[] }
	| { t: 'list'; ordered: boolean; start: number; items: Block[][] }
	| { t: 'pre'; v: string }
	| { t: 'mathBlock'; html: string }
	| { t: 'hr' };

/** Quotes and lists nested deeper than this are shown as plain text. */
const MAX_DEPTH = 8;
const MATH_MAX = 2000;

/** Raw HTML, headings, images, link definitions and indented code are read as ordinary text. */
const DISABLED = ['htmlFlow', 'htmlText', 'headingAtx', 'setextUnderline', 'definition', 'labelStartImage', 'codeIndented'];

function tree(src: string) {
	return fromMarkdown(src, {
		extensions: [{ disable: { null: DISABLED } }, gfmStrikethrough({ singleTilde: false }), gfmAutolinkLiteral(), math()],
		mdastExtensions: [gfmStrikethroughFromMarkdown(), gfmAutolinkLiteralFromMarkdown(), mathFromMarkdown()]
	});
}

/** Web and mail links, and paths on Tapri itself. Everything else (javascript:, data:, //host) is refused. */
function safeHref(url: string): string | null {
	const u = url.trim();
	if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
	if (/^\/(?!\/)/.test(u)) return u;
	return null;
}

function renderMath(src: string, displayMode: boolean): string | null {
	if (src.length > MATH_MAX) return null;
	try {
		const html = temml.renderToString(src, { displayMode, throwOnError: true, trust: false, maxSize: [20, 200], maxExpand: 200 });
		// Belt and braces: Temml with trust off emits no links, scripts or handlers; refuse anything that does.
		return /<script|<a\s|href=|javascript:|\son\w+\s*=/i.test(html) ? null : html;
	} catch {
		return null;
	}
}

/** Text of any node, with markdown syntax removed. */
function flatten(node: Nodes): string {
	switch (node.type) {
		case 'text':
		case 'inlineCode':
		case 'code':
		case 'inlineMath':
		case 'math':
			return node.value;
		case 'break':
			return ' ';
		default:
			return 'children' in node ? node.children.map(flatten).join(node.type === 'root' || node.type === 'list' || node.type === 'listItem' || node.type === 'blockquote' ? ' ' : '') : '';
	}
}

function inlines(nodes: PhrasingContent[], src: string): Inline[] {
	const out: Inline[] = [];
	for (const node of nodes) {
		switch (node.type) {
			case 'text':
				node.value.split('\n').forEach((line, i) => {
					if (i > 0) out.push({ t: 'br' });
					if (line) out.push({ t: 'text', v: line });
				});
				break;
			case 'break':
				out.push({ t: 'br' });
				break;
			case 'strong':
				out.push({ t: 'strong', c: inlines(node.children, src) });
				break;
			case 'emphasis':
				out.push({ t: 'em', c: inlines(node.children, src) });
				break;
			case 'delete':
				out.push({ t: 'del', c: inlines(node.children, src) });
				break;
			case 'inlineCode':
				out.push({ t: 'code', v: node.value });
				break;
			case 'link': {
				const href = safeHref(node.url);
				if (href) out.push({ t: 'link', href, c: inlines(node.children, src) });
				else out.push(...inlines(node.children, src));
				break;
			}
			case 'inlineMath': {
				// "$5 and $10" is money, not math: math must not start or end with a space.
				if (/^\s|\s$/.test(node.value) || !node.value) {
					out.push({ t: 'text', v: src.slice(node.position!.start.offset, node.position!.end.offset) });
					break;
				}
				const html = renderMath(node.value, false);
				out.push(html ? { t: 'math', html } : { t: 'code', v: node.value });
				break;
			}
			default: {
				const raw = node.position ? src.slice(node.position.start.offset, node.position.end.offset) : flatten(node);
				if (raw) out.push({ t: 'text', v: raw });
			}
		}
	}
	return out;
}

function blocks(nodes: RootContent[], src: string, depth: number): Block[] {
	const out: Block[] = [];
	for (const node of nodes) {
		if (depth >= MAX_DEPTH) {
			out.push({ t: 'p', c: [{ t: 'text', v: flatten(node) }] });
			continue;
		}
		switch (node.type) {
			case 'paragraph':
				out.push({ t: 'p', c: inlines(node.children, src) });
				break;
			case 'blockquote':
				out.push({ t: 'quote', c: blocks(node.children, src, depth + 1) });
				break;
			case 'list':
				out.push({
					t: 'list',
					ordered: Boolean(node.ordered),
					start: node.start ?? 1,
					items: node.children.map((item) => blocks(item.children, src, depth + 1))
				});
				break;
			case 'code':
				out.push({ t: 'pre', v: node.value });
				break;
			case 'math': {
				const html = renderMath(node.value, true);
				out.push(html ? { t: 'mathBlock', html } : { t: 'pre', v: node.value });
				break;
			}
			case 'thematicBreak':
				out.push({ t: 'hr' });
				break;
			default: {
				const raw = node.position ? src.slice(node.position.start.offset, node.position.end.offset) : flatten(node);
				out.push({ t: 'p', c: [{ t: 'text', v: raw }] });
			}
		}
	}
	return out;
}

export function parseMarkdown(src: string): Block[] {
	return blocks(tree(src).children, src, 0);
}

/** For excerpts and search snippets: the words, without any syntax. */
export function toPlainText(src: string): string {
	return flatten(tree(src)).replace(/\s+/g, ' ').trim();
}
