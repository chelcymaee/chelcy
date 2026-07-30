// ─── PayGate PayWeb3 — shared checksum + field-order helpers ────────────────
//
// One place for the MD5 checksum logic every paygate-* Edge Function needs
// (initiate, redirect, notify, return, query), so it isn't reimplemented
// separately in each one — same discipline as _shared/admin-session.ts.
//
// Verified against PayGate's official PayWeb3 documentation (Security &
// Checksum, Initiate Request, Redirect to PayWeb, Query Transaction Status
// pages, pasted directly from the live developer portal) plus the official
// PayGate/PayWeb3 GitHub sample code, 2026-07.
//
// No PAYGATE_SANDBOX flag exists here, deliberately — unlike PayFast,
// PayGate has no separate sandbox host. Both the official test credentials
// (PAYGATE_ID 10011072130) and live credentials post to the exact same
// secure.paygate.co.za endpoints; sandbox vs. live is entirely a function
// of which PAYGATE_ID / encryption key are configured as secrets.

import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts';

export const PAYGATE_ID = Deno.env.get('PAYGATE_ID') ?? '';
export const PAYGATE_ENCRYPTION_KEY = Deno.env.get('PAYGATE_ENCRYPTION_KEY') ?? '';

export const PAYGATE_INITIATE_URL = 'https://secure.paygate.co.za/payweb3/initiate.trans';
export const PAYGATE_PROCESS_URL = 'https://secure.paygate.co.za/payweb3/process.trans';
export const PAYGATE_QUERY_URL = 'https://secure.paygate.co.za/payweb3/query.trans';

// Exact field order from PayGate's official "Security & Checksum" page —
// order matters, this is not alphabetical. A field not present in a given
// call is skipped entirely (not sent as an empty segment) — confirmed
// against PayGate's own worked examples, which omit unpopulated optional
// fields from the checksum source string rather than padding for them.
export const INITIATE_FIELD_ORDER = [
  'PAYGATE_ID', 'REFERENCE', 'AMOUNT', 'CURRENCY', 'RETURN_URL',
  'TRANSACTION_DATE', 'LOCALE', 'COUNTRY', 'EMAIL', 'PAY_METHOD',
  'PAY_METHOD_DETAIL', 'NOTIFY_URL', 'USER1', 'USER2', 'USER3',
  'VAULT', 'VAULT_ID',
] as const;

// Used for both the initiate *response* checksum and the redirect-to-PayWeb
// checksum — confirmed identical on both official doc pages (the Initiate
// Request response table says "CHECKSUM: MD5 hash of the response fields",
// which are exactly PAYGATE_ID + PAY_REQUEST_ID + REFERENCE — the same
// formula the Redirect to PayWeb page documents). A verified PAY_REQUEST_ID
// + CHECKSUM pair from the initiate response can be passed straight through
// to the redirect step without recomputing anything.
export const RESPONSE_FIELD_ORDER = ['PAYGATE_ID', 'PAY_REQUEST_ID', 'REFERENCE'] as const;

// Notify payload field order, for reconstructing/verifying its checksum.
// UNLIKE INITIATE_FIELD_ORDER and RESPONSE_FIELD_ORDER above, PayGate's
// official docs never gave a worked example for this one — only "MD5 hash
// calculated from all fields + key." This is the Notify URL Response
// page's own field table row order (the same pattern that held for both
// of the other two formulas), but it is a documented working assumption,
// not something verified byte-for-byte against an official example. It
// must be re-confirmed against the first real sandbox notify payload —
// recompute both this order and raw arrival order against the CHECKSUM
// PayGate actually sends, and see which one matches — before this is
// treated as settled.
export const NOTIFY_FIELD_ORDER = [
  'PAYGATE_ID', 'PAY_REQUEST_ID', 'REFERENCE', 'TRANSACTION_STATUS',
  'RESULT_CODE', 'AUTH_CODE', 'CURRENCY', 'AMOUNT', 'RESULT_DESC',
  'TRANSACTION_ID', 'RISK_INDICATOR', 'PAY_METHOD', 'PAY_METHOD_DETAIL',
  'USER1', 'USER2', 'USER3', 'VAULT_ID', 'PAYVAULT_DATA_1', 'PAYVAULT_DATA_2',
] as const;

function md5Hex(input: string): string {
  return createHash('md5').update(input).digest('hex').toLowerCase();
}

// Builds a checksum over `fields` in the exact order given by `order`,
// skipping any field whose value is missing/empty, then appending the
// encryption key before hashing — the one algorithm every paygate-*
// request and response check uses.
export function buildChecksum(
  fields: Record<string, string | undefined>,
  order: readonly string[],
  encryptionKey: string,
): string {
  const parts = order
    .map((key) => fields[key])
    .filter((v): v is string => v !== undefined && v !== '');
  return md5Hex(parts.join('') + encryptionKey);
}

// Verifies a response/redirect checksum against the same fields + order.
// A plain === on two fixed-length (32-char) MD5 hex digests is fine here —
// unlike the admin PIN comparison, this isn't a secret an attacker is
// trying to guess byte-by-byte via timing, it's integrity verification of
// a value PayGate itself returned over HTTPS.
export function verifyChecksum(
  fields: Record<string, string | undefined>,
  order: readonly string[],
  encryptionKey: string,
  receivedChecksum: string | undefined,
): boolean {
  if (!receivedChecksum) return false;
  return buildChecksum(fields, order, encryptionKey) === receivedChecksum.toLowerCase();
}

// Parses PayGate's form-urlencoded response body (NOT JSON) into a plain
// object — used for the initiate response, and reusable later for
// notify/return/query bodies.
export function parseFormEncoded(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

// PAY_REQUEST_ID is a GUID per PayGate's field spec (varchar(36)) — this is
// deliberately a shape check (hex + hyphens, bounded length), not a strict
// GUID-format assertion, since PayGate hasn't documented a stricter
// contract than "GUID-shaped" and being over-strict here would just be a
// new way for a genuine value to be wrongly rejected.
export function isValidPayRequestId(value: string): boolean {
  return /^[A-Za-z0-9-]{1,36}$/.test(value);
}

// CHECKSUM is always exactly 32 lowercase-or-uppercase hex characters —
// unlike PAY_REQUEST_ID, this one is an exact, well-defined invariant of
// MD5 output, not a heuristic.
export function isValidChecksumShape(value: string): boolean {
  return /^[a-fA-F0-9]{32}$/.test(value);
}

// Minimal HTML-escaping for values interpolated into an auto-submit form.
// Defense-in-depth alongside the shape checks above — every caller of this
// validates its inputs first, but escaping too costs nothing and means a
// validation bug can't become an HTML/script-injection bug.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
