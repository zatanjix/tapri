# Reporting a security problem

If you find a way to break Tapri's promises, especially anything that could link a post to a person,
please report it privately rather than opening a public issue.

**Use GitHub's private vulnerability reporting:** the **Security** tab of this repository →
**Report a vulnerability**. It reaches the maintainers without revealing anything about you.

Things worth reporting:

- any way to connect an email address to an account, or an account to a post;
- anything that exposes IP addresses, email addresses or recovery keys;
- a way to post, vote or read as someone else, or without a verified IITB address;
- a way to bypass the per-email or per-account limits.

Please don't test against the live site in ways that affect other people: no spam, no mass account
creation, and nothing that deletes or alters what others wrote. Run the project locally instead
(see the README); everything needed is in this repository.

For anything that isn't a security problem, use the **Feedback** category inside Tapri.
