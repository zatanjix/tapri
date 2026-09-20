import nodemailer, { type Transporter } from 'nodemailer';

export interface Mailer {
	sendOtp(to: string, code: string): Promise<void>;
}

export class MemoryMailer implements Mailer {
	sent: { to: string; code: string }[] = [];

	async sendOtp(to: string, code: string): Promise<void> {
		this.sent.push({ to, code });
	}

	lastCodeFor(to: string): string | undefined {
		return this.sent.findLast((m) => m.to === to)?.code;
	}
}

/** Local development only. Prints the code, never the address. */
export class DevConsoleMailer implements Mailer {
	async sendOtp(_to: string, code: string): Promise<void> {
		console.info(`[dev mailer] verification code: ${code}`);
	}
}

/** Hands mail to the local MTA (Postfix/OpenSMTPD), which signs with DKIM and has logging disabled. */
export class SmtpMailer implements Mailer {
	private transport: Transporter;

	constructor(
		private from: string,
		host = '127.0.0.1',
		port = 25
	) {
		this.transport = nodemailer.createTransport({ host, port, secure: false, logger: false, debug: false });
	}

	async sendOtp(to: string, code: string): Promise<void> {
		await this.transport.sendMail({
			from: this.from,
			to,
			subject: `${code} is your tapri code`,
			text: `Your code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`
		});
	}
}

/** Sends through Resend's HTTP API. Resend sees the recipient address; it never sees accounts. */
export class ResendMailer implements Mailer {
	constructor(
		private apiKey: string,
		private from: string,
		private fetcher: typeof fetch = fetch
	) {}

	async sendOtp(to: string, code: string): Promise<void> {
		const res = await this.fetcher('https://api.resend.com/emails', {
			method: 'POST',
			headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
			body: JSON.stringify({
				from: this.from,
				to: [to],
				subject: `${code} is your tapri code`,
				text: `Your code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, you can ignore this email.`
			})
		});
		if (!res.ok) throw new Error(`Resend refused the email (${res.status})`);
	}
}
