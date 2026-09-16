# Railway subdomain: Grill / Discovery Notes
Date: 2026-09-13 · Goal: Identify the failing subdomain and resolve the Railway deployment issue.

## Summary / key decisions
- Railway subdomain infrastructure repair verified on 2026-09-13: public HTTPS works and apex redirects to www.
- Production frontend service `soothing-enjoyment` uses Railway custom domain `*.stockfare.app`, target port 8080.
- Cloudflare CNAME `*` points to `yixfk3tg.up.railway.app`; CNAME `_acme-challenge` points to `yixfk3tg.authorize.railwaydns.net`. Retain the verified `_railway-verify` TXT record. Recommended CNAME proxy mode is DNS only.
- Original problem: wildcard AAAA pointed to `100::` with DNS only. During repair a CNAME typo omitted `.app`; this was corrected.
- Apex Cloudflare redirect matches `http*://stockfare.app/*` and targets `https://www.stockfare.app/${2}`, status 301, with query preservation. Apex DNS remains proxied.
- Verified root signup URL redirects and finishes at HTTPS www signup with HTTP 200, preserving query string. Frontend API `/api/v1/health/` returns 200 and `{"status":"ok"}`; `/api/v1/readiness/` returns 200 and `{"status":"ready"}`.
- Railway reports wildcard certificate VALID / COMPLETE, and live TLS verifies successfully. Earlier certificate mismatch disappeared during verification. Railway DNS status fields were inconsistent with the correct public DNS answers.
- User applied Cloudflare changes; assistant inspected Railway/DNS/HTTPS. No application code or existing staged/unstaged edits were modified.

## Q&A log

### Q1 — Failing address
- Asked: What exact subdomain URL is failing?
- Recommended starting point: A failing tenant storefront URL under `stockfare.app`, based on the documented deployment.
- Captured: User supplied Cloudflare DNS screenshot instead of a URL. Wildcard AAAA `100::` is DNS only; apex uses a proxied Railway CNAME. Several explicit staging subdomains are Cloudflare Workers.
- Flags: Exact failing tenant URL remains unspecified; DNS evidence identifies a wildcard routing problem independently.

### Q2 — DNS repair progress
- Asked: Apply the two provided Cloudflare records and reply when saved.
- Captured: User said "next". Inspected DNS instead of assuming completion.
- Findings: ACME record is fixed; wildcard CNAME target has a typo, missing `.app`. Railway still reports traffic routing requires update and certificate ownership validation pending.
- Flags: Correct wildcard target to `yixfk3tg.up.railway.app` -> user.

### Q3 — Wildcard correction and next step
- Asked: Correct wildcard CNAME target and reply when saved.
- Captured: User said "next" again. Live DNS confirms the typo is fixed.
- Findings: HTTPS certificate still pending; root domain returns 404 instead of redirecting.
- Recommended next step: Configure Cloudflare single redirect matching only `stockfare.app` to `https://www.stockfare.app`, preserving path and query string; keep apex DNS proxied.
- Flags: Apply apex redirect -> user; finish certificate/HTTPS verification -> assistant.

### Q4 — Redirect template selection
- Asked: Create the Cloudflare apex-to-www redirect.
- Captured: User supplied a screenshot of Cloudflare's Rule templates screen. It includes `Redirect from root to WWW` in the second row, second column.
- Recommended next action: Click `Create from template` on `Redirect from root to WWW`; configure the previously supplied exact source and target patterns.
- Flags: Redirect has not yet been confirmed deployed -> user.

### Q5 — Redirect form correction
- Asked: Configure the root-to-WWW template with the supplied values.
- Captured: User supplied the redirect editor screenshot. Current rule name is `Redirect from WWW to root [Template]`, request pattern is `https://www.*`, target is `https://${1}`, and status is 301.
- Recommended correction: Name `Root to WWW`; wildcard request `http*://stockfare.app/*`; target `https://www.stockfare.app/${2}`; status 301; preserve query string enabled.
- Flags: Save and deploy corrected rule -> user; live verification -> assistant.

### Q6 — Redirect deployment verification
- Asked: Deploy the corrected root-to-WWW redirect.
- Captured: User said "next". Live HTTPS request confirms HTTP 301 from `https://stockfare.app/signup?domain_check=1` to `https://www.stockfare.app/signup?domain_check=1`, preserving path and query string.
- Findings: Railway now reports wildcard certificate VALID / COMPLETE, but live HTTPS to `www.stockfare.app` still fails certificate hostname validation. Public Google DNS resolves the two required CNAMEs correctly, despite Railway DNS status inconsistencies.
- Flags: Investigate certificate served by the Railway edge -> assistant.

## Open flags (pending input)
- No remaining blocker found for wildcard DNS, HTTPS, apex redirect, or frontend API connectivity.
- A specific existing tenant storefront URL was never supplied; tenant-specific storefront behavior has not been verified.

## Session close
- Reconciled notes with final live checks; searchable locally using `rg` in `notes/`. No external retrieval index is configured or updated.
- Suggested reusable follow-up: add a short DNS troubleshooting entry to the deployment README covering wildcard `100::`, exact CNAME targets, and apex redirects; proposed only, not applied.

## Reopened — Tenant admin failure
- User reports `https://dox.stockfare.app/admin` is "not reached".
- Specific tenant hostname is now known: `dox.stockfare.app`. Investigate DNS, TLS, hostname resolution, and admin authentication redirects.
- Live checks: `https://dox.stockfare.app/admin` returns HTTP 200 with valid TLS; `/api/v1/readiness/` returns HTTP 200 and `{"status":"ready"}`. Google public DNS resolves the hostname through `yixfk3tg.up.railway.app` to `69.46.46.83`.
- Asked for exact browser error. User answered: "This site can’t be reached / Check if there is a typo in dox.stockfare.app. / DNS_PROBE_FINISHED_NXDOMAIN".
- Diagnosis: user-side DNS resolution is failing despite successful public DNS and HTTPS checks; stale negative DNS cache is a likely cause, pending a second public resolver check.
- Second resolver verified: both Cloudflare and Google return the correct CNAME and `69.46.46.83`. This supports a browser/network resolver cache issue rather than a missing public DNS record.
- Recommended next action: in Chrome, use secure DNS with Cloudflare (1.1.1.1), restart browser, and retry the exact admin URL. If on Windows, `ipconfig /flushdns` can clear cached negative DNS responses. User-side success remains unconfirmed.
