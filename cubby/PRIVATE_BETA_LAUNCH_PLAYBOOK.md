# CUBBY — PRIVATE BETA LAUNCH OPERATIONS PLAYBOOK

**Created:** 2026-07-16
**Author:** Founder-directed launch execution session (this document)
**Status:** Draft — pending founder review and approval
**Purpose:** This is the operating plan for the next phase of Cubby's launch — not an engineering document. `PROJECT_MASTER_PLAN.md` remains the source of truth for code/infrastructure status. This file exists because engineering readiness is now ahead of go-to-market readiness, and closing that gap requires a different kind of work: host acquisition, beta recruitment, support operations, and risk management.

**Assumption baked into this plan:** Apple Developer approval and PayFast merchant onboarding may each take 1–2 more weeks, and neither can be accelerated by us. Every action item below is chosen specifically because it does *not* depend on either.

---

## 1. 14-DAY ACTION PLAN

This is a template, not a rigid schedule — adjust pacing to actual founder bandwidth. The principle behind the ordering: legal/registration items go first because they have their own external latency (don't discover on day 10 that something needed to start on day 1); the single largest engineering task (route collisions) gets a dedicated day rather than being squeezed in; and there's a deliberate rest day, because 14 consecutive high-intensity days produces worse decisions, not better ones.

| Day | Focus | Action |
|---|---|---|
| 1 | Legal | Confirm company registration status (CIPC). If not started, start today — this likely gates the PayFast merchant account too (see Risk #4 in Section 7). |
| 1 | Hosts | Draft founding-host target list: 15–20 real Cape Town businesses across cafe/guesthouse/hostel/hotel/tour_operator categories, concentrated in one or two tourist-dense nodes (see Section 2). |
| 2 | Engineering | Build the ToS acceptance gate at signup (checkbox + block until accepted). |
| 2 | Hosts | First 5 founding-host approaches — in person or phone/WhatsApp, not cold email. |
| 3 | Engineering | Live-verify the flagged `profiles` RLS question (30 min, same `pg_policies` method used earlier this engagement). Fix `host-detail.tsx`'s infinite-skeleton dead end. |
| 3 | Hosts | Next 5 approaches. |
| 4 | Engineering | Route collisions fix (7 filenames reused across role folders) — full day, this is the largest single item. |
| 5 | Engineering | Finish route collisions + regression-test all affected screens on all 3 roles. |
| 5 | Hosts | Follow up with non-responders from days 2–3. |
| 6 | Engineering | Bag count +/− buttons — re-verify current behavior, fix if still broken. |
| 6 | Beta prep | Draft the beta tester invite list — start from people you actually know who'd realistically use Cubby in Cape Town. |
| 7 | — | Buffer / rest day. Review week 1 against this plan, adjust week 2. |
| 8 | Engineering | Confirm notification DB schema live (tables/columns/RLS). Confirm `admin-partner-applications` and `admin-support-messages` are deployed with `ADMIN_SECRET` set. |
| 8 | Ops | Start drafting the Founder Operations Manual (Section 4) — support runbook first. |
| 9 | Ops | Stand up a basic morning dashboard (even a saved SQL query is enough to start — see Section 4). |
| 10 | Beta prep | Write the beta onboarding welcome sequence (in-app + WhatsApp/email). Finalize invite list and stagger it into waves. |
| 11 | Store prep | Prepare App Store Connect and Play Console listing assets (screenshots, description, privacy labels) so submission is same-day once Apple approves. |
| 12 | Hosts | Check founding-host count against the liquidity bar in Section 2. If short, focused recruitment push — don't move to traveller invites until this bar is met. |
| 13 | Dry run | Founder walks the entire booking flow end-to-end as a real user would, both traveller and host side, against a real seeded host listing. This catches integration issues unit-by-unit fixes miss. |
| 14 | Go/no-go | Check Apple/PayFast status, confirm the engineering Must-Complete list (Section 6) is closed, confirm host liquidity bar met. Decide: open first beta wave now, or extend host recruitment. |

---

## 2. HOST ACQUISITION STRATEGY

**Why this comes first:** a two-sided marketplace beta that invites travellers before it has real supply is the single most common way these launches fail. A traveller who opens the app to an empty map in Cape Town doesn't come back, and the negative first impression is very hard to undo with the same person twice.

**Founding host targets:** 15–20 hosts, deliberately concentrated rather than spread across the city. Density matters more than coverage at this stage — 8 pins clustered around one tourist-dense area (e.g. the City Bowl / Long Street corridor, or the V&A Waterfront approach) reads as "a real marketplace" on the map; 15 pins scattered across greater Cape Town reads as empty no matter the total count. Mix business types deliberately (cafes and guesthouses are typically the easiest first conversations — lower commitment, existing foot traffic, direct incremental revenue with no downside).

**Daily outreach goals:** 5 direct approaches per day, in person or by phone/WhatsApp — not cold email, which will convert far worse for a brand-new, unknown platform. At a realistic 20–30% conversion rate for a founder personally pitching, that's 1–2 signed hosts per day, reaching the 15–20 target within 10–14 days.

**Partnership pipeline (parallel to direct outreach, lower individual effort per host but slower to close):**
- Backpacker hostel associations / hostel owner networks in Cape Town
- Cape Town Tourism or similar local tourism-board contacts
- Co-working spaces (many already handle short-term guest storage informally)
- University study-abroad / international-student offices (they field "where do I store my bags" questions constantly)

**Success metrics for host acquisition:**
- Number of active, verified hosts (not just signed up — `is_verified = true` and listing complete with photo + price)
- Geographic density within the target zone (not raw city-wide count)
- Average listed capacity (bags) per host
- Each host has explicitly set an expected response time (even informally, e.g. "I check my phone by 9am and 6pm")

**Minimum viable marketplace liquidity — the actual bar before inviting a single traveller:** at least **8–10 verified, active hosts within a 5km radius of the primary tourist zone**, each with a real photo and price set. Opening to travellers before this exists guarantees a bad first impression and wastes a beta invite that's expensive to earn back.

---

## 3. BETA RECRUITMENT STRATEGY

**Ideal tester profiles:** a deliberate mix, but weighted toward real usage over friendly testing —
- Real travellers actually in or heading to Cape Town during the beta window (via host/hostel partnerships, personal network, study-abroad contacts)
- Friends/family willing to do genuine test bookings even without real travel need — useful for generating initial activity and reviews, but flagged explicitly: **this group alone won't validate product-market fit, only real travellers will.** Don't let the convenience of friendly testers substitute for recruiting real ones.

**How many testers:** given the 8–10 host liquidity bar, cap the first wave at **25–40 travellers**, deliberately leaner than the master plan's original 50–200 Private Beta range — that range assumes host supply that doesn't yet exist. Scale up within the beta window as more hosts come online, not before.

**Invitation sequence:** staggered waves of 5–10, not all at once. This keeps support load manageable and lets the founder catch and fix issues while the blast radius is still small, before the next wave arrives.

**Onboarding flow:** a short welcome message on first login explaining it's a beta, what to expect (rough edges, active development), how to report a problem, and the primary contact channel.

**Feedback collection:** Cubby doesn't have a built-in reporting screen yet (flagged as Not Started in the engineering roadmap). Near-term stopgap: a simple shared WhatsApp group or a lightweight external form — don't wait for the in-app version to exist before collecting feedback.

**Bug reporting process:** direct channel to the founder/support number (`+27 77 460 9484`, already live in the app), with testers asked to screenshot or screen-record when possible.

**Communication cadence:** a check-in message after each tester's first booking, a weekly beta digest/update to the whole cohort, and a committed response SLA during the beta window (e.g. same-day response to any reported issue).

---

## 4. FOUNDER OPERATIONS MANUAL

**Daily founder checklist:**
1. Check Sentry for new crashes/errors overnight
2. Check the admin dashboard for pending verifications, unresolved support messages, and partner applications
3. Check for new bookings needing host/traveller attention
4. Respond to the support WhatsApp/phone channel

**Morning dashboard (no analytics tool exists yet — this is the stopgap):** a saved Supabase query or lightweight dashboard covering: new signups, new bookings by status, pending verifications, unresolved support messages, and crash count from Sentry. Building this properly is one of the higher-leverage uses of the 14-day window (Section 1, Day 9).

**Customer support workflow:** acknowledge within a committed window (recommend 2 hours during the beta window given the small cohort), triage into bug / question / dispute, resolve directly or escalate.

**Booking issue escalation:** define "urgent" explicitly — e.g. a traveller physically stuck with luggage and an unresponsive host is urgent (same-hour response); a general question about how pricing works is routine (same-day response).

**Host support playbook:** common issues will be payout timing questions and listing edits — document short, reusable answers now rather than improvising each time.

**Traveller support playbook:** common issues will be booking confusion and refund requests — same principle, reusable answers ready in advance.

**Manual payout process** (payouts are currently `pending_manual` — there is no automated payout system): document the exact steps — identify completed bookings pending payout → calculate each host's 70% share → send EFT → mark paid in the admin dashboard. Set a fixed cadence (e.g. weekly payout run on a specific day) so hosts know what to expect, since trusting a brand-new platform with real money is a real ask.

**Manual refund process:** document how a cancellation or dispute triggers a manual PayFast refund and the corresponding booking-status update, since no automated refund flow exists yet.

**Emergency procedures:** what happens if a payment double-charges, or a security incident occurs — who gets contacted, in what order, and what the immediate containment step is. This should exist in writing before it's needed, not improvised during an incident.

---

## 5. MEASURABLE SUCCESS CRITERIA FOR PRIVATE BETA

| Metric | Target |
|---|---|
| Active verified hosts | 15+ maintained through the beta window |
| Completed bookings | 30+ within the first 30 days |
| Host response time | Average under 4 hours |
| Booking completion rate | 85%+ of confirmed bookings complete without cancellation |
| Payment success rate | 95%+ once PayFast is live |
| Crash-free sessions | 99%+ (directly measurable via Sentry) |
| Customer satisfaction | Average 4+/5 on a simple post-booking rating |

**Conditions before graduating to Public Beta:** all Section 6 "Must Complete" and "Can Complete During Private Beta" engineering items closed; PayFast live with real transactions processed successfully; the above metrics held for several consecutive weeks, not just hit once; no unresolved critical bugs; and majority-positive qualitative feedback from the beta cohort.

---

## 6. ENGINEERING TASK CLASSIFICATION

**Must complete before Private Beta** (materially reduces launch risk, no external dependency):
- ToS acceptance gate at signup
- `profiles` RLS verification (still-open security question from the original audit)
- `cancelBooking()` silent error swallowing — this exact failure mode already caused one real regression this engagement
- Route collisions across role folders (trust/possibly-security issue, not just cosmetic)
- `host-detail.tsx` infinite-skeleton dead end
- Bag count +/− buttons, if still broken (blocks a core transactional detail)
- Notification DB schema + admin edge function deployment confirmation (operational readiness, not just correctness)

**Can complete during Private Beta** (real, but the app functions without them and in-app fallbacks exist):
- Push notification production credentials (APNs/FCM) — in-app notifications already work regardless
- Email notification system (booking confirmation/decline)
- Verification signed URL 7-day expiry fix
- Response rate accuracy fix (currently always shows 100%)
- Read receipts on messages

**Can wait until Public Beta** (won't be noticed by a small, founder-supported beta cohort):
- On-device Android Maps visual confirmation (configuration already verified correct)
- Push notification tap deep-linking
- `MOCK_REVIEWS` on zero-review host profiles
- Default 404 page styling
- Host analytics dashboard
- Real GPS radius search (PostGIS) / search ranking algorithm

**Remove entirely** (dead weight, not deferred work):
- The deprecated Peach Payments edge functions (`create-payment`, `payment-page`, `payment-result`, `payment-webhook`) — currently kept "for reference" but no longer called. Recommend actually deleting rather than leaving live, unused endpoints as attack surface and future confusion.
- Any residual references to the R2,000 bag coverage claim, if a fresh grep turns up anything the Sprint 1 removal missed — worth one confirmation pass, not a new task if already clean.

---

## 7. OPERATIONAL RISKS THAT COULD SINK PRIVATE BETA EVEN WITH PERFECT SOFTWARE

1. **Empty marketplace at launch.** Travellers invited before the host liquidity bar is met see a near-empty map, churn immediately, and word-of-mouth turns negative before the product gets a fair test. This is the single highest risk in this entire plan.
2. **Founder-as-single-point-of-failure.** Admin access is a client-side PIN, payouts and refunds are manual, verification review is manual — if the founder is unavailable even briefly, the whole operation stalls. No backstop exists for this today.
3. **Host response-time tracking is currently broken** (always shows 100%), which means slow hosts damage traveller trust invisibly — the metric meant to catch this problem doesn't actually work yet.
4. **Company registration gap.** The ToS document uses a `[COMPANY NAME]` placeholder because the company isn't registered. This is very possibly *why* the PayFast merchant account is taking time — payment processors typically require a registered entity — and it leaves Cubby without proper corporate liability protection if a real dispute or injury claim arises during beta.
5. **Untested payment volume.** PayFast has only been sandbox-tested; the first real transactions at any scale are inherently higher-risk than the hundredth.
6. **A bad first-booking experience permanently souring an early adopter** who would otherwise have become a long-term advocate — in a small, tightly-networked beta cohort, one bad experience travels fast.
7. **Security incident risk** from the still-open `profiles` RLS question — trust erodes fast and is hard to rebuild in a small cohort where everyone talks to everyone.
8. **Inviting travellers faster than host supply can absorb them**, directly violating the liquidity principle in Section 2 — easy to do under pressure to "just launch."
9. **No structured feedback loop.** Without one, testers who hit friction quietly stop using the app, and the founder never learns why — silent churn is much harder to fix than a reported bug.

---

## 8. PRIORITIZED LAUNCH ROADMAP (COMBINED)

This synthesizes Sections 1–7 into a single sequence. Read top to bottom as the actual order of operations, not a wishlist.

1. **Legal:** Confirm/accelerate company registration (Day 1) — gates both proper ToS completion and, likely, PayFast.
2. **Engineering — Must Complete list** (Section 6), sequenced across Days 2–8, largest item (route collisions) given a dedicated day.
3. **Host acquisition** running in parallel from Day 1 — this has the longest lead time of anything in the plan and the highest consequence if under-resourced, so it starts immediately and doesn't wait for engineering to finish.
4. **Founder Operations Manual** drafted Days 8–9, before any beta tester is invited — support and payout processes need to exist before they're needed, not be improvised live.
5. **Beta recruitment and onboarding sequence** prepared Days 6–10, but invites are not sent until the host liquidity bar (Section 2) is confirmed met.
6. **Store listing prep** (Day 11) — done in advance so Apple/Google approval, whenever it lands, doesn't become a second bottleneck after being the first one.
7. **Dry run** (Day 13) — a full end-to-end walkthrough as a real user, catching integration issues that isolated fixes miss.
8. **Go/no-go decision** (Day 14) against explicit criteria: engineering Must-Complete closed, host liquidity bar met, Apple/PayFast status checked (not blocking the decision, just informing timing).
9. **First beta wave** (5–10 testers) once the above is true — not on a calendar date, on these conditions being met.
10. **Can-Complete-During-Beta engineering items** (Section 6) continue in the background once the beta is live.
11. **Public Beta graduation** only once the Section 5 success criteria hold for multiple consecutive weeks, not on a single good week.

---

**A note on what this playbook deliberately does not include:** no new product features. Every item above either reduces real launch risk or builds operational capacity that doesn't currently exist. Anything that would count as feature work has been explicitly filtered out, per the instruction that engineering readiness is currently ahead of go-to-market readiness — the gap to close is operational, not technical.
