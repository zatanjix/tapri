import { describe, expect, it } from 'vitest';
import { parseMarkdown, toPlainText, type Block, type Inline } from '../../src/lib/shared/markdown';

const p = (...c: Inline[]): Block => ({ t: 'p', c });
const text = (v: string): Inline => ({ t: 'text', v });

/** Every string that could end up in the page, gathered from a tree. */
function strings(node: unknown): string[] {
	if (typeof node === 'string') return [node];
	if (Array.isArray(node)) return node.flatMap(strings);
	if (node && typeof node === 'object') return Object.values(node).flatMap(strings);
	return [];
}

describe('parseMarkdown', () => {
	it('keeps plain text and turns single newlines into line breaks', () => {
		expect(parseMarkdown('Mess food\nis bad')).toEqual([p(text('Mess food'), { t: 'br' }, text('is bad'))]);
		expect(parseMarkdown('one\n\ntwo')).toEqual([p(text('one')), p(text('two'))]);
	});

	it('formats bold, italic, strikethrough and code', () => {
		expect(parseMarkdown('**a** *b* ~~c~~ `d`')).toEqual([
			p({ t: 'strong', c: [text('a')] }, text(' '), { t: 'em', c: [text('b')] }, text(' '), { t: 'del', c: [text('c')] }, text(' '), { t: 'code', v: 'd' })
		]);
	});

	it('makes lists, quotes and code blocks', () => {
		expect(parseMarkdown('- a\n- b')).toEqual([{ t: 'list', ordered: false, start: 1, items: [[p(text('a'))], [p(text('b'))]] }]);
		expect(parseMarkdown('3. x\n4. y')).toEqual([{ t: 'list', ordered: true, start: 3, items: [[p(text('x'))], [p(text('y'))]] }]);
		expect(parseMarkdown('> said')).toEqual([{ t: 'quote', c: [p(text('said'))] }]);
		expect(parseMarkdown('```\nx < y\n```')).toEqual([{ t: 'pre', v: 'x < y' }]);
	});

	it('links http, https, mailto and same-site paths only', () => {
		expect(parseMarkdown('[swc](https://example.org/a)')).toEqual([p({ t: 'link', href: 'https://example.org/a', c: [text('swc')] })]);
		expect(parseMarkdown('see www.example.org')).toEqual([p(text('see '), { t: 'link', href: 'http://www.example.org', c: [text('www.example.org')] })]);
		expect(parseMarkdown('[thread](/p/12)')).toEqual([p({ t: 'link', href: '/p/12', c: [text('thread')] })]);
		for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', '//evil.example', 'vbscript:x'])
			expect(strings(parseMarkdown(`[x](${bad})`)).some((s) => s === bad)).toBe(false);
	});

	it('shows headings, images, raw HTML and definitions as text', () => {
		expect(parseMarkdown('# Not a heading')).toEqual([p(text('# Not a heading'))]);
		const all = strings(parseMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)> ![a](https://x.org/i.png)\n\n[r]: https://x.org'));
		expect(all.join('')).toContain('<script>');
		expect(JSON.stringify(parseMarkdown('<b>hi</b>'))).not.toContain('"t":"html"');
		expect(JSON.stringify(parseMarkdown('![a](https://x.org/i.png)'))).not.toContain('"t":"image"');
	});

	it('renders math to MathML', () => {
		const [para] = parseMarkdown('Area is $\\pi r^2$ here') as [Extract<Block, { t: 'p' }>];
		const math = para.c[1] as Extract<Inline, { t: 'math' }>;
		expect(math.t).toBe('math');
		expect(math.html.startsWith('<math')).toBe(true);
		const [block] = parseMarkdown('$$\n\\frac{a}{b}\n$$');
		expect(block.t).toBe('mathBlock');
	});

	it('never produces executable markup from math', () => {
		for (const src of ['\\href{javascript:alert(1)}{x}', '\\url{javascript:alert(1)}', '\\htmlId{x}{y}', '\\rule{99999em}{99999em}', '<script>alert(1)</script>', '\\def\\a{\\a\\a}\\a']) {
			// Only `html` fields are ever inserted as markup; everything else is escaped text.
			const html = JSON.stringify(parseMarkdown(`$${src}$`)).match(/"html":"(?:[^"\\]|\\.)*"/g)?.join(' ') ?? '';
			expect(html).not.toMatch(/<script|javascript:|\son\w+=|href=/i);
		}
	});

	it('caps the size of math elements', () => {
		expect(JSON.stringify(parseMarkdown('$\\rule{99999em}{99999em}$'))).not.toContain('99999');
	});

	it('leaves prices alone', () => {
		expect(parseMarkdown('Books cost $5 and $10 each')).toEqual([p(text('Books cost '), text('$5 and $'), text('10 each'))]);
	});

	it('shows broken math as code', () => {
		expect(parseMarkdown('$\\frac{$')).toEqual([p({ t: 'code', v: '\\frac{' })]);
	});

	it('flattens absurdly deep nesting instead of recursing forever', () => {
		const deep = '>'.repeat(200) + ' x';
		expect(() => parseMarkdown(deep)).not.toThrow();
		expect(JSON.stringify(parseMarkdown(deep)).match(/"quote"/g)!.length).toBeLessThanOrEqual(8);
	});
});

describe('toPlainText', () => {
	it('removes markdown syntax', () => {
		expect(toPlainText('**Bold** and [a link](https://x.org)\n- item\n> quote $x^2$')).toBe('Bold and a link item quote x^2');
	});

	it('keeps search highlight markers', () => {
		expect(toPlainText('**mess** food')).toBe('mess food');
	});
});
