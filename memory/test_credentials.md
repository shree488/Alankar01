# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## New Alankar Jewellers — owner portal (July 2026)
- Route: /admin (top-navigation Owner Login button or public footer owner login link)
- Master password: `admin@alankar`
- Role: owner. No email, PIN, registration or test customer account.
- Password is configured in backend/.env ADMIN_PASSWORD; only bcrypt hash stored in Mongo users.
- Auth: POST /api/auth/login {password}, GET /api/auth/me, POST /api/auth/refresh, POST /api/auth/logout.
- Send X-CSRF-Protection: 1 for auth/admin mutations; cookie-based Secure HttpOnly JWT access + refresh tokens and Mongo-revocable session.
- UI session hint: sessionStorage naj-owner-session (not an authorization credential).
- Public appointments: POST /api/bookings, Mongo vip_bookings. Admin listing/status updates require owner session.
- Helpline and WhatsApp: +91 9890271037.
- No sample products seeded. Tests must remove their temporary products/uploads metadata/bookings after verification.
