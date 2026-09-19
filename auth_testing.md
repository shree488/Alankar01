# Owner authentication testing

Password-only owner login, no public registration. Use credentials in /app/memory/test_credentials.md.
1. Verify Mongo users contains one owner with bcrypt $2b$ password hash (no plaintext); unique role index; TTL session/login-attempt indexes.
2. Login POST /api/auth/login with {password}; requests send X-CSRF-Protection: 1. Confirm Secure HttpOnly SameSite=None access (15m) and refresh (7d) cookies.
3. GET /api/auth/me with cookies returns owner; without credentials returns 401. Protected products/bookings/uploads reject missing/invalid sessions.
4. Refresh /api/auth/refresh restores access, only for unexpired Mongo-backed session. Logout removes cookies AND revokes session; replay old tokens must fail.
5. Five incorrect password attempts per IP produce a 15-minute lockout. Test isolated IP; do not lock the QA browser out.
6. Mutations reject untrusted Origin and absent CSRF header. Public booking remains unauthenticated.
7. In browser, /admin renders only lock screen until /me verification; persistent cookie session survives refresh. Lock & Logout removes storage UI hint immediately, hides dashboard, revokes server session; browser back and forged localStorage must not unlock.
8. Test all APIs via REACT_APP_BACKEND_URL, not stale hosts.
9. Preview gateway Origin normalization: CSRF_TRUSTED_ORIGINS allowlists the exact external frontend and its known internal cluster alias from environment. CORS preflight remains restricted to FRONTEND_URL (external only); custom X-CSRF-Protection header remains required. Reject any supplied Referer outside the trusted origins, including spoofed requests with otherwise valid tokens. No wildcard domain/forwarded-host trust.
10. July 2026 visual exceptions: footer copyright now says 'All rights reserved.'; navbar tagline is English 'Symbol of Purity' in warm gold; hero crest tagline is 'Symbol Of Purity'. Footer brand tagline stays Marathi.
