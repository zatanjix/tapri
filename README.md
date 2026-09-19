# tapri

**An anonymous, open-source forum for the IIT Bombay community.**

A *tapri* is the chai stall where people say what they actually think, usually over a cutting chai at an hour they should be asleep. This is that, online: one place for insti junta to raise grievances, ask for the fundae nobody asks for out loud, and talk about how things really are, without anyone knowing who said what.

Tapri is independent. It is not affiliated with or endorsed by the institute or any of its bodies.

## Promises

1. **Only the IIT Bombay community gets in.** Every account is backed by a verified `@iitb.ac.in` address.
2. **Nobody can link a post to a person,** including the people who run the server.
3. **Nothing unnecessary is kept.** No IP addresses, email addresses, device data or analytics.
4. **Everything is verifiable.** The code is open, and these promises are enforced by automated tests.
5. **Help is always one tap away,** on every page, logged in or not.

## How anonymity works

Proving you *belong* and proving *who you are* are different things. Tapri separates them with **blind signatures** ([RFC 9474](https://www.rfc-editor.org/rfc/rfc9474)).

```
  YOUR BROWSER                                 TAPRI
  1. Creates a random ticket and seals it
                        ── email + sealed ticket ─▶
                                               2. Sends a code to your IITB email
  3. You enter the code ───────── code ──────────▶
                                               4. Stamps the sealed ticket without opening it,
                                                  notes "this email joined this semester",
                                                  forgets the email
                        ◀──── stamped ticket ─────
  5. Unseals it: a stamped ticket Tapri has never seen

     ··· a short random pause ···

  6. Hands in the ticket + a new recovery key ───▶
                                               7. Checks the stamp, marks the ticket used,
                                                  creates your account
```

Tapri stamps *something* for a verified email, then later accepts *a* valid ticket. Because the ticket was sealed when stamped, it's mathematically impossible to tell which email a ticket came from. The short pause stops timing from linking the two.

There are **no usernames or passwords**. Your account is a recovery key, like `K7QM-2XRT-9BWD-F4NH-6JPC-3VLA`. Keep it safe: nobody can recover it for you, because nobody knows which account is yours.

| Tapri knows | Tapri cannot know |
|---|---|
| That an IITB email joined this semester (as a keyed hash, unreadable after the semester) | Which account belongs to which email |
| That one pseudonymous account wrote certain posts | Who that account is |
| What's posted | Your IP address, device or browser |

## Product decisions

| Decision | Why |
|---|---|
| **Members-only** | Personal stories need a closed room. Nothing is indexed by search engines; link previews are generic. |
| **Any `iitb.ac.in` address**, including staff | Simple and honest; signup says so plainly. |
| **Fixed categories**: Academics, Hostel & Mess, Wellbeing, Harassment, Administration, Placements, General | One place instead of dozens of scattered groups. |
| **Grievances and conversations** | Grievances collect an **"Affects me too"** count. A problem 340 people have marked is hard to dismiss. Conversations (**"I feel this too"** in Wellbeing) are for questions, advice and support. |
| **A new random name in every thread** | Consistent within a conversation, untraceable across them. The thread author is marked `OP`. |
| **One level of replies, sorted by most helpful** | Readable on phones; supportive answers rise first. |
| **No images or uploads** | Photos carry hidden location and device metadata. |
| **Drafts stay on your device** | Unfinished posts never reach the server. |
| **One verification per email per semester**; accounts last until the end of the next semester | One account per person, and membership stays current. |
| **Web app**, installable to the home screen | Runs everywhere, instantly, with no app-store identity. |

## Privacy engineering

- **No IP addresses anywhere.** Logging is off at every layer. Rate limiting uses an in-memory hash of the IP with a secret discarded daily.
- **No third parties.** No CDN, analytics, or external fonts or scripts.
- **Emails are never stored.** Only `HMAC(email, semester_key)` is kept, and the key is destroyed each semester.
- **Verification happens in memory.** A restart erases anything in progress.
- **Recovery keys and sessions are stored only as SHA-256 hashes.**
- **Minimal timestamps.** They exist only where a feature needs one.
- **Outbound links carry no referrer.**

Tests enforce this:
- no table can hold both email-derived data and an account id;
- no column exists for IPs, user agents or raw emails;
- a full signup is followed by a scan of **every row of every table** for the email and ticket.

## Architecture

```
Browser ──HTTPS──▶ Caddy (TLS, no logs) ─┐
Tor ─────onion───▶ tor ──────────────────┤
                                         ▼
               App (SvelteKit on Node, TypeScript)
               ├─ Issuer      blind signatures
               ├─ Verifier    one-time email codes
               ├─ Accounts    tickets, recovery keys, sessions
               ├─ Forum       posts, replies, votes, "affects me too"
               └─ Limits      in-memory rate limiting
                                         │
                                    PostgreSQL
```

- **Self-hosted on a single server,** with no managed platforms, since those require an identity and keep logs.
- **Codes are sent from Tapri's own mail server.** Email services keep recipient lists.

## Cryptography

| Item | Choice |
|---|---|
| Blind signatures | RFC 9474 `RSABSSA-SHA384-PSS-Randomized`, 3072-bit, via [`@cloudflare/blindrsa-ts`](https://github.com/cloudflare/blindrsa-ts) in browser and server |
| Issuer key | New each semester; private key stored as an owner-only file, never in the database |
| Tickets | 32 random bytes; spent tickets recorded as `sha256` |
| Recovery key | 120 random bits in Crockford base32; forgiving of case, spaces and `O`/`I`/`L` |
| Sessions | 256-bit `HttpOnly`, `Secure`, `SameSite=Strict` cookie, stored as `sha256` |
| Thread names | `HMAC(server_key, account ‖ thread)` mapped to an adjective–animal list |

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/issuer/key` | This semester's public key |
| `POST /api/verify/start` | Email + sealed ticket → sends a code |
| `POST /api/verify/otp` | Code → stamped ticket |
| `POST /api/account` | Ticket + recovery key → account and session |
| `POST /api/account/renew` | Fresh ticket → extends your account |
| `POST` / `DELETE /api/session` | Sign in with a recovery key / sign out |
| `GET /api/categories` | Categories |
| `GET /api/feed?tab=&sort=&category=&page=` | Feed. Tabs: `all`, `conversations`, `grievances`, `unanswered`. Sorts: `hot`, `new`, `affected` |
| `GET /api/feed/most-affected` | Most affected grievances this week |
| `POST /api/posts` | New post (`category`, `kind`, `title`, `body`) |
| `GET` / `DELETE /api/posts/:id` | Thread with replies / delete your own post |
| `POST /api/posts/:id/replies` | Reply (`body`, optional `parentId`) |
| `POST /api/posts/:id/metoo` | Toggle "affects me too" |
| `POST /api/vote` | Toggle an upvote (`targetType`, `targetId`) |
| `DELETE /api/replies/:id` | Delete your own reply |

## Support and wellbeing

- **"Get help" is on every page** and works without an account.
- **Resources are ordered by urgency:** emergency, 24×7, on campus, outside campus.
- **Each category shows help that fits it:** counselling for Wellbeing, complaint and anti-ragging channels for Harassment, and escalation contacts for grievances.
- **Distress in any post or reply** brings up a gentle note with support options. It never blocks posting.
- **Numbers are tap-to-call** and kept in a single, regularly checked file.

Contacts come from public institute circulars; listing them implies no affiliation.

## Development

Requires **Node 22 LTS** and **Docker**.

```sh
cp .env.example .env
npm install
npm run db:up      # Postgres (dev + test)
npm run migrate
npm run keygen     # this semester's keys, in ./keys
npm test
npm run dev
```

In development, codes are printed to the terminal (email addresses never are). Production requires `MAILER=smtp`, and `SOURCE_URL` should point to the public repository so every page links to its source.

At the start of each semester:

```sh
npm run keygen -- 2027-spring
npm run retire-key -- 2026-autumn
```

## Layout

```
migrations/              SQL
scripts/                 migrate, keygen, retire-semester-key
src/lib/client/          browser side of blind signatures, signup storage, API client
src/lib/shared/          recovery keys, support contacts, distress detection, time
src/lib/server/          crypto, verification, accounts, forum, mail, rate limiting, headers
src/lib/components/      interface components
src/routes/              pages: welcome, join, sign in, feeds, threads, composer, help
src/routes/api/          HTTP endpoints
tests/                   unit and integration tests, including anonymity checks
```

## License

[GNU Affero General Public License v3.0 or later](LICENSE). If you run a modified version of Tapri as a service, you must publish your changes.

---

<sub>Made in Powai, over too many cutting chais.</sub>
