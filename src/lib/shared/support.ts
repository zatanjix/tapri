/**
 * Support contacts shown across Tapri. A wrong number here is the worst bug the site can have:
 * check every entry against its source whenever this file changes, and update LAST_CHECKED.
 */

export interface SupportItem {
	name: string;
	detail?: string;
	/** Display form of the number. */
	phone?: string;
	/** Dialable form: digits, optional leading +. */
	tel?: string;
	url?: string;
	cta?: string;
}

export interface SupportTier {
	id: 'urgent' | 'now' | 'campus' | 'outside';
	title: string;
	items: SupportItem[];
}

export const LAST_CHECKED = 'September 2026';

export const DISCLAIMER =
	'Tapri is an independent student forum and is not affiliated with IIT Bombay or the Student Wellness Centre. These are publicly shared contacts, listed here for convenience.';

export const TIERS: SupportTier[] = [
	{
		id: 'urgent',
		title: 'In danger right now',
		items: [
			{
				name: 'IIT Bombay Hospital emergency',
				detail: 'Open 24×7. Go directly, or call.',
				phone: '022 2159 1110',
				tel: '02221591110'
			},
			{ name: 'Hospital emergency (mobile)', phone: '+91 82912 97051', tel: '+918291297051' },
			{ name: 'Quick Response Team (male)', phone: '98333 38989', tel: '9833338989' },
			{ name: 'Quick Response Team (female)', phone: '91673 98598', tel: '9167398598' }
		]
	},
	{
		id: 'now',
		title: 'Talk to someone now, 24×7',
		items: [
			{ name: 'Talk to Angel helpline', detail: 'Free and confidential.', phone: '080 4713 6761', tel: '08047136761' },
			{
				name: 'Talk to Angel online',
				detail: 'Chat or video with a counsellor.',
				url: 'https://swc.iitb.ac.in/online',
				cta: 'Open'
			}
		]
	},
	{
		id: 'campus',
		title: 'On campus',
		items: [
			{
				name: 'SWC walk-in counselling',
				detail: 'NN Main Building, 3rd floor. 10 AM–6 PM every day, including weekends and holidays. Intercom 9070.',
				phone: '022 2576 9070',
				tel: '02225769070'
			},
			{ name: 'Through your mentor', detail: 'Your DAMP or ISMP mentor can connect you with a counsellor.' }
		]
	},
	{
		id: 'outside',
		title: 'Outside campus',
		items: [
			{
				name: 'External counselling',
				detail: 'Empanelled agencies. Charges are reimbursable.',
				url: 'https://my.iitb.ac.in/swc-ext/',
				cta: 'Open'
			},
			{ name: 'Tele-MANAS', detail: 'National mental health helpline, 24×7.', phone: '14416', tel: '14416' },
			{ name: 'KIRAN', detail: 'National mental health helpline, 24×7.', phone: '1800 599 0019', tel: '18005990019' }
		]
	}
];

/** The two contacts shown in compact support surfaces. */
export const QUICK = {
	angel: TIERS[1].items[0],
	swc: TIERS[2].items[0],
	hospital: TIERS[0].items[0]
};

export interface CategoryNote {
	text: string;
	/** Show counselling contacts alongside the note. */
	counselling: boolean;
}

export const CATEGORY_NOTES: Record<string, CategoryNote> = {
	wellbeing: {
		text: 'If this sounds like you too, you can talk to a counsellor any time. It is free and confidential.',
		counselling: true
	},
	harassment: {
		text: "You can report harassment to the institute's Internal Complaints Committee, and ragging to the national anti-ragging helpline on 1800 180 5522. Counsellors can help too.",
		counselling: true
	},
	placements: {
		text: 'If the pressure is getting to you, counsellors can help.',
		counselling: true
	},
	general: {
		text: 'Need someone to talk to? Support is available any time.',
		counselling: true
	}
};

export const categoryNote = (slug: string): CategoryNote | undefined => CATEGORY_NOTES[slug];
