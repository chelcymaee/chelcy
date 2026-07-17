# CUBBY — TERMS OF SERVICE (DRAFT)

**Status:** Draft for legal review. Not yet reviewed by a South African attorney. Two founder decisions — the fee model and the cancellation policy — were reviewed and confirmed by the founder on 2026-07-17; the remaining open items below are still unresolved. Do not treat as final or binding until attorney review is complete.
**Drafted:** 2026-07-17
**Reflects:** Cubby's actual product, code, and operations as they exist today — not planned future functionality. Every substantive claim in this document was checked against the live codebase before being written; where the document states current fee amounts, payout mechanics, or policy enforcement, those figures were pulled directly from `booking.tsx`, `complete-booking/index.ts`, `bookings.tsx`, and `schema.sql`, not from the previous in-app Terms screen, which was found to contain inaccuracies (see Legal Review Notes).

**How to use this draft:** every bracketed `[Founder Decision Required]` marker is a real open question — this document does not resolve them on the founder's behalf. Read the Legal Review Notes section before publishing any version of this document to users.

---

## 1. Introduction

Cubby ("Cubby", "we", "us", "our") is a peer-to-peer marketplace connecting Travellers who need short-term luggage storage with Hosts who offer storage space at their premises (cafés, hotels, guesthouses, hostels, and similar locations).

Cubby is currently operated as a trading name. **[Founder Decision Required — see Legal Review Note #1]** No company has yet been formally registered to operate Cubby. Until a company is registered, these Terms are being offered by [FOUNDER FULL NAME / TRADING NAME], and references to "Cubby" in a legal sense mean that person or entity, not a separate registered company.

By creating an account or using the Cubby app, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use Cubby.

## 2. Definitions

- **"Traveller"** — a user who books storage space from a Host.
- **"Host"** — a user who lists storage space for Travellers to book.
- **"Booking"** — a confirmed agreement between a Traveller and a Host for storage of a specified number of bags, for a specified drop-off and pick-up window.
- **"Booking Value"** — the total amount charged to the Traveller for a Booking, including the Platform Fee (defined below).
- **"Platform Fee"** — the additional amount added to a Host's listed price at checkout, currently calculated as 10% of the Host's listed price.
- **"Host Payout"** — the amount paid to a Host for a completed Booking, currently calculated as 70% of the Booking Value (the amount the Traveller paid, inclusive of the Platform Fee) — see Section 11 for a worked example.
- **"Platform"** — the Cubby mobile and web application.

## 3. Eligibility

You must be at least 18 years old to create a Cubby account. **[Founder Decision Required — see Legal Review Note #2]** Cubby's signup flow does not currently verify age (there is no date-of-birth field or age gate). This clause states the required policy, but it is not currently technically enforced.

Hosts must provide accurate business and location details and, before accepting bookings, are strongly encouraged to complete Cubby's identity verification process (Section 6). **[Founder Decision Required]** Verification is not currently mandatory before a Host can list or accept bookings — decide whether to require it before Public Beta.

## 4. Account Creation

You create an account with an email address and password, and select a role (Traveller, Host, or both). You are responsible for keeping your login credentials secure and for all activity under your account. You must provide accurate information and keep it up to date.

You may delete your account at any time from Profile → Delete Account. See our Privacy Policy for what happens to your data when you do.

## 5. Identity Verification

Cubby offers an optional identity verification process: you may be asked to upload a photo of an identity document and a selfie photo. These are reviewed manually by Cubby's team, and if approved, your account receives a verified badge visible to other users.

**Verification is a trust signal, not a guarantee.** It does not vouch for a user's character, intentions, or conduct, and Cubby is not liable for the actions of any user, verified or not.

## 6. Traveller Responsibilities

As a Traveller, you agree to:
- Declare an accurate number and type of bags when making a Booking.
- Not store any illegal item, weapon, flammable or hazardous material, perishable good, or any item prohibited by law (see Section 13 — Prohibited Items).
- Arrive within the agreed drop-off and pick-up windows, or communicate with your Host if plans change.
- Remain responsible for the contents of your own luggage at all times — Cubby and Hosts do not inspect the contents of stored bags beyond what is visibly apparent.

## 7. Host Responsibilities

As a Host, you agree to:
- Provide accurate information about your storage location, capacity, and pricing.
- Store bags securely for the agreed Booking period.
- Respond to Booking requests in a timely manner. **[Founder Decision Required]** Cubby does not currently enforce a maximum response time or measure this accurately (the in-app "response rate" figure is not yet functioning correctly — see item 4 in "Founder decisions still required") — decide whether to commit to a specific response-time standard in this document before it is technically measurable.
- Refuse storage of, and not tamper with, any item reasonably believed to violate Section 13.
- Not represent Cubby, or make commitments on Cubby's behalf, to Travellers.

Hosts are independent third parties, not Cubby employees, contractors, or agents. Cubby does not itself take custody of, store, or handle any luggage.

## 8. Booking Process

1. A Traveller selects a Host, a number of bags, and a drop-off/pick-up date and time, and completes payment through PayFast at the time of booking (Section 9).
2. Once payment is received, the Booking is confirmed.
3. The Traveller drops off their bags at the agreed time; a Booking-specific code is used to verify drop-off and pick-up.
4. Once the Traveller collects their bags, the Booking is marked complete and the Host Payout is calculated (Section 11).

Cubby's current booking flow does not include a separate Host accept/decline step before payment — a Host is notified once a Booking is confirmed and paid, rather than approving it beforehand. *(Correction from an earlier version of this draft, which described payment as happening after Host acceptance — verified against the live booking flow, `app/(host)/requests.tsx`, while auditing the cancellation policy in Section 12.)*

**[Founder Decision Required]** There is currently no enforced minimum or maximum notice period for making a Booking, and no enforced limit on how far in advance a Booking can be made.

## 9. Payments

All payments are processed through PayFast, a South African payment processor. Cubby does not receive or store your card details.

**Current operational status:** Cubby's PayFast integration is fully built but, as of this draft, is running against PayFast's sandbox environment only — **no live PayFast merchant account exists yet, meaning no real payments can currently be processed.** This document should not be published to real users making real Bookings until a live merchant account is active. **[Founder Decision Required]**

Once live, the amount charged to a Traveller at checkout is the Host's listed price plus the Platform Fee (see Section 11 for exactly how this is calculated and what it means for Host Payouts).

## 10. Manual Payouts

Cubby does not currently have an automated payout system. Host Payouts are calculated when a Booking is marked complete, and are paid out **manually by Cubby via EFT** to the Host's provided bank details.

**[Founder Decision Required — see Legal Review Note #3]** There is currently no fixed, published payout schedule (e.g. "weekly on Fridays"). Do not state a specific payout timeline in a public-facing version of this document unless a process exists to actually meet it — an unmet published commitment is worse than no commitment stated at all. The safest wording for Private Beta, until a fixed schedule is operational, is:

> "Host Payouts are processed manually and are not made on a fixed automatic schedule during the Private Beta period. Cubby will make reasonable efforts to process payouts promptly."

## 11. Fees

**Confirmed for Private Beta (2026-07-17):** Cubby uses its currently-implemented fee model (referred to internally during drafting as "Model A") — the model already live in `booking.tsx`, `complete-booking/index.ts`, `revenue.tsx`, and `host-payouts.tsx`. No code changes were required to reach this decision; this section has been rewritten to explain that model clearly, using a worked example rather than percentages alone.

**Worked example — a R100 host listing, 1 bag, 1 day:**

| Step | Amount |
|---|---|
| Host lists a price of | R100 |
| Platform Fee added at checkout (10% of R100) | + R10 |
| **Total the Traveller pays** | **R110** |
| Host Payout (70% of the R110 the Traveller paid) | **R77** |
| Cubby retains (30% of the R110 the Traveller paid) | **R33** |

**In short: a Host currently receives approximately 77% of their listed price**, not their full listed price plus a separate on-top deduction. The 70/30 split is calculated on the full amount the Traveller pays (which already includes the 10% Platform Fee) — not on the Host's original listed price alone. This is the same math shown, in simplified form, to Hosts on the bank details screen in the app.

Cubby may change the Platform Fee percentage or the Host Payout percentage at any time, with the rate in effect at the time of a Booking applying to that Booking.

## 12. Cancellations

**Confirmed for Private Beta (2026-07-17):** full refund, cancel anytime before drop-off.

You may cancel a Booking at any time before the scheduled drop-off time, at no charge. If you have already paid, Cubby will refund the full amount you paid. Refunds are currently processed manually by Cubby; there is no fixed guaranteed refund timeframe during the Private Beta, but Cubby will process refunds promptly.

This is a deliberate choice, not a placeholder: an earlier version of this document (the in-app Terms screen) described a stricter policy — free cancellation only up to 1 hour before drop-off, with a fee of up to 50% within that window — but that policy was never actually implemented anywhere in the code, and publishing an unenforced fee policy was judged a real dispute risk. This section now matches exactly what the app actually does: cancelling a Booking does not charge a fee, regardless of how close to drop-off the cancellation occurs.

## 13. Prohibited Items

You may not store, and Hosts may refuse to store:
- Illegal items or substances of any kind.
- Weapons, firearms, or ammunition.
- Flammable, explosive, or otherwise hazardous materials.
- Perishable goods.
- Live animals.
- Any item whose storage would violate South African law.

Cubby and Hosts reserve the right to refuse or remove storage of any item reasonably believed to violate this section.

## 14. Luggage Restrictions

Travellers declare a number of bags at booking. **[Founder Decision Required]** There is currently no enforced size or weight limit per bag anywhere in the product. Until one exists, the safest wording is:

> "Cubby does not currently set a maximum size or weight per bag. A Host may refuse to accept an item that is unreasonably large, heavy, or otherwise impractical to store safely, and is not obligated to store an item that was not reasonably described at the time of booking."

## 15. Lost or Damaged Luggage

**Cubby does not provide insurance, a guarantee, or any compensation scheme for lost, damaged, or stolen luggage, and does not currently operate any claims process.** This was a deliberate decision — an earlier version of Cubby's marketing referenced a "R2,000 coverage" figure; this claim has been removed everywhere in the product because no corresponding claims mechanism was ever built, and stating a coverage amount with no way to actually pay a claim would be a direct misrepresentation to users.

Travellers are strongly encouraged to obtain independent travel insurance covering their belongings while in storage. Any coverage or claims process Cubby introduces in future will be described in a separate, updated document and will not apply retroactively to Bookings made before it exists.

## 16. Liability Limitations

Cubby acts solely as an intermediary connecting Travellers and Hosts. To the maximum extent permitted by South African law, Cubby is not liable for:
- Loss, theft, damage, or delay affecting stored luggage.
- Injury, dispute, or disagreement arising between a Traveller and a Host.
- The accuracy of information provided by a Host or Traveller.
- Any indirect, incidental, or consequential loss arising from use of the Platform.

Use of the Platform is at your own risk. **[Requires legal review]** This clause should be reviewed against South Africa's Consumer Protection Act (CPA), which limits how far a business can exclude liability toward consumers — a blanket liability exclusion of this kind may not be fully enforceable as written, particularly once real (non-beta) consumers are transacting for real money. See "Areas requiring legal review" in the Legal Review Notes.

## 17. Indemnity

You agree to indemnify and hold Cubby harmless from any claim, loss, or damage (including reasonable legal costs) arising from your breach of these Terms, your use of the Platform, or your violation of any law or third-party right. **[Requires legal review]** This is standard boilerplate for a marketplace platform of this kind and has not been tailored beyond that — a South African attorney should confirm it is appropriately scoped and enforceable, especially given Section 1's company-registration status.

## 18. Intellectual Property

The Cubby name, logo, app, and all associated content (excluding user-generated content) are owned by Cubby and may not be copied, modified, or used without permission.

By posting content on Cubby (listing photos, profile photos, reviews, messages), you grant Cubby a non-exclusive, royalty-free license to use, display, and reproduce that content for the purpose of operating and promoting the Platform. You retain ownership of your content.

**[Requires legal review]** This section did not exist in any previous version of Cubby's Terms and has been drafted fresh as standard marketplace boilerplate — it has not been tailored to any Cubby-specific intellectual property beyond the obvious (name, logo, app).

## 19. Privacy

Cubby's collection and use of your personal information is described in full in our Privacy Policy, available in the Cubby app (Profile → Privacy Policy), which forms part of these Terms by reference. Key points: payments are processed by PayFast (Cubby does not see your card details), data is stored via Supabase, transactional emails are sent via Resend, and you have rights under South Africa's Protection of Personal Information Act (POPIA) including access, correction, and deletion of your data.

*(Repo cross-reference for maintainers: `app/(traveller)/privacy.tsx`.)*

## 20. Account Suspension and Termination

Cubby may suspend or terminate an account that violates these Terms, engages in fraudulent or unsafe behaviour, or receives a pattern of substantiated negative reports. **[Founder Decision Required]** There is currently no formal, documented internal process for deciding when an account should be suspended — this is handled at the founder's discretion today. Consider documenting internal criteria before Public Beta, even if not published to users, so suspension decisions are consistent and defensible.

You may terminate your own account at any time (Profile → Delete Account).

## 21. Dispute Resolution

**[Founder Decision Required — see "Founder decisions still required" in the Legal Review Notes]** Cubby does not currently have a dedicated in-app dispute or reporting mechanism (no "report a problem with this booking" screen exists yet). Until one exists, the safest wording is:

> "If a dispute arises between a Traveller and a Host, or between a user and Cubby, please contact Cubby support at hello@mycubby.co.za or +27 77 460 9484. Cubby will attempt in good faith to help resolve the dispute but is not obligated to act as an arbitrator and makes no guarantee of a particular outcome."

A South African attorney should advise on whether to add a formal dispute-resolution clause (e.g. referral to arbitration, mediation, or South Africa's Consumer Protection Act / National Consumer Commission processes) before Public Beta, once real money is changing hands at scale.

## 22. Governing Law

These Terms are governed by the laws of the Republic of South Africa. Any dispute not resolved under Section 21 will be subject to the jurisdiction of the South African courts. **[Requires legal review]** This should be confirmed once Section 1's company-registration question is resolved, as jurisdiction and standing may depend on the legal entity operating Cubby.

## 23. Changes to These Terms

We may update these Terms from time to time. Continued use of Cubby after a change takes effect means you accept the updated Terms. Material changes will be reflected by an updated "Last updated" date at the top of this document.

## 24. Contact Information

Questions about these Terms: hello@mycubby.co.za or +27 77 460 9484.

---

# LEGAL REVIEW NOTES

*This section is written for the founder and for the reviewing attorney, not for end users. Do not publish this section as part of the user-facing Terms of Service.*

## Missing policies (did not exist anywhere before this draft)
- Intellectual property clause (Section 18)
- Indemnity clause (Section 17)
- Formal dispute resolution language (Section 21)
- Any internal, documented criteria for account suspension decisions (Section 20)

## Resolved decisions (2026-07-17)

These two items were the two most consequential open questions in the original draft, both now settled by the founder after a full code + documentation audit:

- **Fee model — confirmed.** Section 11 now reflects the model already implemented in `complete-booking/index.ts`, `revenue.tsx`, and `host-payouts.tsx`: the 70/30 split applies to the full Traveller-paid amount (inclusive of the 10% Platform Fee), meaning Hosts currently net ~77% of their listed price. No code changes were required — the audit found this matches every existing piece of host-facing UI (`bank-details.tsx`) and admin tooling; it was the *previous in-app Terms wording* that was ambiguous/inaccurate, not the underlying system. The host-facing fee explanation in the app has been improved to use the same worked example as this document (see companion PR).
- **Cancellation policy — confirmed.** Section 12 now states a full refund for any cancellation before drop-off, with no fee — matching exactly what `bookings.tsx`'s cancellation logic already does. The previous in-app Terms' stated 1-hour/50%-fee policy has been dropped rather than kept as an unenforced promise.

A related, uncovered-during-this-audit correction: Section 8 (Booking Process) previously described payment as happening *after* Host acceptance. Auditing the cancellation flow revealed this is backwards — in the live PayFast flow, payment happens immediately at booking creation, with no separate Host accept/decline gate. Section 8 has been corrected to match.

## Founder decisions still required (in order of importance)

1. **Company registration.** Cubby currently has no registered legal entity. Every clause in this document that assumes "Cubby" can enter into a binding contract, hold liability, or be sued/sue is resting on an unregistered trading name. Until this is resolved, the founder should understand they are very likely personally the contracting party with every user. This is the single highest-priority item in this entire review — recommend expediting company registration before any real (non-friends-and-family) user signs up, and it may also be the reason the PayFast merchant account application is taking time, since payment processors typically require a registered entity.
2. **Age eligibility is stated but not enforced.** No date-of-birth field or age gate exists in the signup flow. Low risk for a beta with a small, known cohort; a real risk if the platform opens to public registration.
3. **No published payout schedule exists**, and payouts are fully manual. Recommend not committing to a specific cadence in a public document until one is operationally reliable.
4. **Host response-rate tracking is inaccurate** (flagged elsewhere in the engineering roadmap as always showing 100%). Don't commit to a specific response-time standard in the Terms until this is fixed and can actually be measured/enforced.
5. **No in-app dispute/reporting mechanism exists.** Section 21 uses the safest available wording (direct users to the support channel) until a real reporting flow is built.
6. **Verification is optional and not required to transact.** Confirm this is the intended trust/safety posture for Public Beta, or decide to make it mandatory for Hosts before then.

## Areas requiring legal review (not founder decisions — genuinely need an attorney)

- **Section 16 (Liability Limitations)** — a blanket liability exclusion needs to be checked against South Africa's Consumer Protection Act, which restricts how far liability can be excluded toward consumers. This is the clause most likely to need rewording by counsel, not just review.
- **Section 17 (Indemnity)** — standard boilerplate, needs confirmation it's appropriately scoped and enforceable given the company-registration status.
- **Section 18 (Intellectual Property)** — newly drafted, needs a standard IP-clause review.
- **Section 21 (Dispute Resolution)** — needs advice on whether a formal arbitration/mediation clause, or a specific reference to the National Consumer Commission / Consumer Protection Act processes, should be added.
- **POPIA compliance generally** — the Privacy Policy referenced in Section 19 has not been independently reviewed by an attorney either (it says so on its own "Last updated" page); a full POPIA compliance review of both documents together is recommended as a single pass.

## Clauses that should be revisited before Public Beta (even if acceptable for Private Beta)

- Section 9 (Payments) — must be updated the moment a live PayFast merchant account exists; the current "sandbox only" caveat should not survive into Public Beta.
- Section 10 (Manual Payouts) — should be replaced with a real, committed schedule once payout volume justifies automating or formalizing it.
- Section 12 (Cancellations) — the no-fee policy was a deliberate choice for Private Beta, not a placeholder; revisit only if cancellation volume/timing data during the beta suggests a fee tier is actually needed, and only once the engineering to enforce it exists.
- Section 20 (Account Suspension) — should reference documented internal criteria once they exist, rather than "founder's discretion."
- Section 21 (Dispute Resolution) — should be upgraded once an in-app reporting flow exists.

## Assumptions made while drafting

- Assumed the founder is a natural person operating as a sole trader under the "Cubby" trading name, since no company name was available to insert. If a company has since been registered, Section 1 and the closing signature block need the correct registered entity name and registration number.
- Assumed "South Africa" governing law and POPIA are the correct regulatory framework, consistent with every other reference in the codebase (PayFast, `.co.za` domain, ZAR pricing implied).
- Assumed the Bag Runner delivery role, though present in the database schema and referenced in the previous Terms draft, should **not** be described as a currently available service, since it is explicitly disabled at signup during Private Beta (confirmed in `signup.tsx`). If Bag Runner is reactivated, this document needs a new section covering it before that happens.
- Did not assume any specific dollar/rand liability cap, since none exists anywhere in the current product — a South African attorney may recommend adding one.

---

# DOCUMENT QUALITY SCORE: 7.5 / 10 (up from 6.5)

**What changed:** the two highest-stakes open items — the fee model and the cancellation policy — are now resolved, verified against the code, and stated with a worked example rather than percentages alone. Section 8's booking-process sequence was also corrected after the cancellation audit surfaced it was wrong. These were the items most likely to cause real user-facing harm (a Host misunderstanding their earnings; a Traveller being told about an unenforced cancellation fee), so resolving them is worth more than the raw count (2 of 8 decision items closed) suggests.

**What this score means:** this document is structurally complete, uses precise and consistent defined terms, and every factual claim — including the two now-confirmed ones — was verified directly against the live code rather than assumed or copied from the previous in-app Terms. It is closer to lawyer-ready than before, but still not ready to publish as-is.

**What would be required to reach lawyer-ready (9-10/10):**
1. Company registration resolved, and Section 1 updated with the actual registered entity name and number (or a deliberate, informed decision to proceed as a sole trader, understood as such). **This remains the single largest gap.**
2. Founder resolves the 6 remaining `[Founder Decision Required]` items — a lawyer cannot finalize clauses that depend on business decisions only the founder can make.
3. A South African attorney reviews Sections 16, 17, 18, and 21 specifically against the Consumer Protection Act and standard SA marketplace-platform precedent.
4. A joint POPIA compliance pass across this document and the existing Privacy Policy.
5. Once Section 9 is updated to reflect a live (not sandbox) PayFast merchant account, a final consistency check between what the Terms say and what the product actually does — the same verification method used to write this draft.
