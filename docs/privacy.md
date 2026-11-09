---
title: Lablr privacy policy
---

# Lablr privacy policy

Effective November 9, 2026.

Lablr is a small web app for managing Gmail labels. This page explains what it does with your data.

## What Lablr accesses

Lablr asks Google for two things:

- **Your basic profile** (name, email address and profile picture) when you sign in, to show who is signed in.
- **Your Gmail labels** (the `gmail.labels` scope) when you click Grant access: label names, colors, visibility settings and message counts, so you can view, create, edit and delete them.

Lablr can't read, send or delete your email. The `gmail.labels` scope only covers labels.

## What Lablr stores

- **No database.** Lablr doesn't save your labels, profile or anything else.
- **Your Google access token** is kept in the server's memory for your session only. It's discarded when you sign out, when the session expires after inactivity, or when the server restarts. Lablr doesn't request or keep refresh tokens.
- **Server logs** record requests (such as which label ID was changed) and errors, for troubleshooting. They're kept in Google Cloud Logging under its default retention, currently 30 days.
- **In your browser**, Lablr sets a session cookie and a security (CSRF) cookie, and remembers two display preferences in local storage: the grid's page size and whether system labels are shown.

## Sharing

Lablr doesn't sell, share or transfer your data to anyone, and doesn't use it for advertising. Your labels go only between your browser, Lablr's server and Google.

Lablr's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Removing access

You can sign out at any time, and revoke Lablr's access to your Google account at [myaccount.google.com/connections](https://myaccount.google.com/connections).

## Contact

Questions about this policy: [open an issue on GitHub](https://github.com/Lyreks/Lablr/issues).
