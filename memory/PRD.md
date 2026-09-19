# PRD — NEW ALANKAR JEWELLERS

## Original product goal
A premium responsive digital storefront for New Alankar Jewellers, with supplied crest branding, hallmark/trust messaging, collections, storytelling, VIP appointment requests and WhatsApp inquiries at +91 9890271037. Original dark/gold design, simulated rates and stock-product catalog were superseded by the client's updated requirements below.

## Current approved requirements (July 2026)
- Pearl White (#FFFFFF/#FAF9FB), Royal Purple (#3B1254/#4A154B), Warm Gold (#D4AF37/#C5A880); charcoal text. No dark theme.
- Marathi public storefront; brand remains NEW ALANKAR JEWELLERS. Trust line: शासकीय मान्यताप्राप्त आणि १००% बीआयएस हॉलमार्क प्रमाणित दागिने.
- English VIP Appointment Booking form: Full Name, Phone Number, Date, Time Slot, Metal Preference.
- English owner portal behind password-only lock screen, password supplied by client. Correct session verification required before any dashboard/private data renders. Persistent session, Lock & Logout, Back to Store, visible top-navigation Owner Login button (desktop/tablet/mobile) and discreet footer मालक प्रवेश link.
- ONLY real owner-created products. No fake/sample product seeding, no stock product catalogue. Empty state: लवकरच नवीन दागिने उपलब्ध होतील.
- Product fields: Title, Ornaments Type / Section, Metal Type, Weight (grams), Description, Active Status, real file upload OR direct HTTP(S) image URL.
- Ornament sections: अंगठी (Ring), नेकलेस / हार (Necklace), बांगड्या / तोडे (Bangles), मंगळसूत्र (Mangalsutra), कानातले (Earrings), इतर (Other Custom). Public filter includes सर्व दागिने.
- Metals: Gold 24K, Gold 22K, Gold 18K, Silver, Platinum. Purity/metal badge and weight on product cards, no price calculation.
- Product add/edit/delete/activation sync with public catalog. Inactive products only visible to owner.
- Product WhatsApp prefill: नमस्कार न्यू अलंकार ज्वेलर्स, मला या दागिन्याबद्दल अधिक माहिती हवी आहे. Product identification appended; recipient 919890271037.
- Booking requests persist to MongoDB, appear in owner inquiries; Pending/Confirmed status, direct customer Call and WhatsApp actions.
- Completely remove all rates/tickers/market feeds/calculators from public and admin; do NOT suggest restoring them without a new explicit client request.

## Latest visual overrides (implemented and browser-verified)
1. Footer copyright ends: All rights reserved.
2. Navbar small tagline: Symbol of Purity, warm gold (#987224, chosen for readable contrast), Jost.
3. Hero crest tagline: Symbol Of Purity (exact capitalization).
4. Footer brand tagline remains पवित्रतेचे प्रतीक. Rest of public copy remains Marathi except the approved English booking and brand/visual overrides.

## Architecture
- Frontend React 19 + CRA/craco, Tailwind, custom CSS variables, framer-motion, Lenis, shadcn Dialog/Input/Textarea, Lucide, Sonner, react-router-dom.
- App.js composes routes: / public storefront; /admin/* owner gateway/workspace. Scroll reset on route change. Reduced motion respected.
- Public components: src/components/site/{Ticker,Navbar,Hero,TrustStrip,Collections,ProductImage,Heritage,Marquee,Reveal,Footer,BookingModal,WhatsAppFloat}. Rate component deleted.
- Admin: src/pages/AdminPage.jsx and components/admin/{AdminWorkspace,ProductPanel,ProductEditor,ImageUpload,BookingDesk}.
- Shared src/lib/data.js contains categories/metal labels/contact config only (NO products/rates). src/lib/api.js centralizes env-based fetch, cookies, refresh retry, error formatting, cross-tab notifications. FormFields.jsx provides labeled inputs/selects.
- Every API call strictly uses process.env.REACT_APP_BACKEND_URL; removed old same-origin fallback.
- Storefront/admin re-fetch every 5 seconds and on focus; BroadcastChannel sends immediate same-browser cross-tab catalog/booking updates.
- FastAPI modules: server.py lifecycle/CORS/headers/router composition; database.py dotenv + Motor; models.py validated inputs and BaseDocument/PyObjectId serialization; auth.py owner auth; catalog.py products/bookings; storage.py uploads/media.
- Mongo connection MONGO_URL and DB_NAME unchanged. All persisted document models use ObjectId-to-string BaseDocument helpers; no raw ObjectId JSON responses.

## Authentication and security
- Master password configured in backend/.env ADMIN_PASSWORD; bcrypt hash stored in users, idempotent owner seeding. No registration, PIN, OAuth, email login or other roles.
- JWT access cookie 15 minutes + refresh cookie up to 7 days: Secure, HttpOnly, SameSite=None, /api path. Mongo sessions checked server-side and revoked by logout. Password configuration changes revoke existing owner sessions.
- sessionStorage holds only UI hint/explicit-lock flag, NEVER authoritative access tokens. /auth/me verification gates mounting of private workspace.
- Require X-CSRF-Protection: 1 on all auth/admin mutations; validate Origin and supplied Referer against explicit CSRF_TRUSTED_ORIGINS env allowlist.
- Preview ingress normalizes browser Origin to internal cluster alias. Resolved tested browser403 issue by adding ONLY that exact alias plus external frontend to CSRF_TRUSTED_ORIGINS. Do not trust arbitrary forwarded hosts or wildcard domains. CORS preflight remains restricted to external FRONTEND_URL.
- Mongo-backed 5-failed-attempt/15-minute lockout with TTL. Currently identifier is request.client.host; ingress may share that IP, so lockout can affect the single-owner gateway globally. No untrusted X-Forwarded-For parsing added.
- Owner portal noindex; auth/admin responses no-store. No private data fetched/rendered while locked.

## Persistent image storage
- Managed object storage integration is REAL; initialized successfully and tested multi-chunk upload/download.
- Env: INTEGRATION_PROXY_URL, EMERGENT_LLM_KEY, STORAGE_APP_NAME. No storage credentials exposed to frontend.
- Authenticated upload initialization -> sequential 512 KiB chunks -> Pillow image validation -> managed storage PUT -> Mongo media reference.
- JPG/PNG/WebP only; max8MiB, max20MP; MIME and actual raster verification; reject negative/out-of-order/oversized/incomplete chunks. Temporary Mongo upload staging expires after1hour; successful completion deletes staging doc.
- Public random-ID /api/media/{id} serves persisted image; no arbitrary proxy/SSRF fetch. Direct image URLs load in browser.
- Progress includes preparing, uploading, validating/saving, completion; errors visible. Object storage cannot physically delete objects; references can be soft-deleted. QA image metadata removed, storage orphan test bytes may remain.

## Data models and endpoints
- products: title, section, metal, weight, image_url, description, active, created_at, updated_at.
- vip_bookings: reference NAJ-XXXXXXXX, name, phone, date, time, metal_interest, status Pending/Confirmed, created_at. Legacy requested statuses migrated to Pending; preexisting bookings preserved.
- users, sessions, login_attempts, uploads, media persist auth/files.
- GET /api/health
- GET /api/products (active only)
- POST /api/bookings (public validated request; returns reference and Pending)
- POST /api/auth/login, GET /api/auth/me, POST /api/auth/refresh, POST /api/auth/logout
- GET/POST /api/admin/products; PUT/DELETE /api/admin/products/{id}
- GET /api/admin/bookings; PATCH /api/admin/bookings/{id}
- POST /api/admin/uploads; PUT /api/admin/uploads/{id}/chunks/{index}; POST /api/admin/uploads/{id}/complete
- GET /api/media/{id}
- /api/rates removed (404).

## Completed and verification
- Full approved white/purple/gold redesign, Marathi localization, English bookings, secure admin, real catalog CRUD/filters/WhatsApp, real chunked photo uploads, inquiries desk implemented.
- Removed stock products, rates endpoints/UI, fake history, unverified opening hours, delivery/buyback claims, and placeholder social links. Crest is client-supplied; hero is a decorative crest composition, not sample merchandise.
- Build: yarn build compiled successfully.
- QA reports: /app/test_reports/iteration_1.json (identified preview Origin blocker), iteration_2.json (resolved;39 backend tests pass,1 ingress-dependent case skipped and covered by5 direct security tests).
- Browser QA: correct/wrong owner login, refresh persistence, forged-storage rejection, logout/server revocation, real2.4MB photo upload, URL product, edits/category changes, deactivate/reactivate/delete cancel+confirm, booking confirmations and customer contact links.
- Mobile390px: public store/menu, owner lock/dashboard/editor/inquiries verified with no page overflow.
- Latest three inline visual edits verified again through browser; hero Symbol Of Purity, gold navbar Symbol of Purity, copyright All rights reserved.
- Subsequent owner-access enhancement: added gold-bordered Owner Login button with lock icon to top navbar (/admin). Always-visible label, including320px; tablet/mobile menu breakpoints adjusted without changing authentication. Frontend QA iteration_3.json passed at320/390/768/1024/1280px, including click-to-lock-screen, correct login/logout/Back to Store, mobile menu and booking modal. No data or credentials changed.
- Final DB after QA:0 products,0 media,0 upload staging,0 login attempts;2 legacy bookings NAJ-HIIE9T and NAJ-5PSONR preserved. QA sessions cleared. No test data presented as client merchandise.
- Regression files: /app/backend/tests/backend_test.py and test_security_extra.py. Run serial (-n0). Credentials documented in /app/memory/test_credentials.md. Auth playbook /app/auth_testing.md.
- No mocked APIs or rates. WhatsApp is real browser click-to-chat handoff; no automatic messaging integration. Booking confirmation awaits owner, never falsely presented as confirmed.

## Prioritized remaining items / backlog
- P0 implementation blockers: none. Client review of finished experience remains welcome.
- P1 content onboarding (owner action): add genuine products and real jewellery photography through the portal. No sample merchandise should be inserted.
- P2 verified showroom address, opening hours and social handles, if client supplies them. Do not invent business data.
- Optional future ideas (not yet requested): product photo zoom; downloadable Marathi catalogue; showroom directions after verified address.
- No further structural refactor required for current scope. Preserve focused modules; do not reintroduce the superseded rates/calculator/sample catalog.
