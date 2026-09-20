import { describe, expect, it, vi } from 'vitest';
import { DevConsoleMailer, MemoryMailer, ResendMailer } from '../../src/lib/server/mail/mailer';

describe('mailers', () => {
	it('MemoryMailer records messages for tests', async () => {
		const m = new MemoryMailer();
		await m.sendOtp('a@iitb.ac.in', '123456');
		expect(m.lastCodeFor('a@iitb.ac.in')).toBe('123456');
	});

	it('DevConsoleMailer never prints the email address', async () => {
		const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
		await new DevConsoleMailer().sendOtp('secret-person@iitb.ac.in', '654321');
		const printed = spy.mock.calls.flat().join(' ');
		expect(printed).toContain('654321');
		expect(printed).not.toContain('secret-person');
		spy.mockRestore();
	});

	it('ResendMailer posts the code to the Resend API', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		const fake = (async (url: string, init: RequestInit) => {
			calls.push({ url, init });
			return new Response('{"id":"x"}', { status: 200 });
		}) as unknown as typeof fetch;
		await new ResendMailer('key_123', 'Tapri <codes@example.org>', fake).sendOtp('a@iitb.ac.in', '123456');
		expect(calls[0].url).toBe('https://api.resend.com/emails');
		expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer key_123');
		const body = JSON.parse(String(calls[0].init.body));
		expect(body).toMatchObject({ from: 'Tapri <codes@example.org>', to: ['a@iitb.ac.in'] });
		expect(body.subject).toContain('123456');
	});

	it('ResendMailer throws when sending fails', async () => {
		const fake = (async () => new Response('nope', { status: 422 })) as unknown as typeof fetch;
		await expect(new ResendMailer('k', 'x@example.org', fake).sendOtp('a@iitb.ac.in', '1')).rejects.toThrow(/422/);
	});
});
