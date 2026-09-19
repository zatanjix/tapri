import { describe, expect, it, vi } from 'vitest';
import { DevConsoleMailer, MemoryMailer } from '../../src/lib/server/mail/mailer';

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
});
