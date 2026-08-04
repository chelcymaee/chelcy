import { supabase } from './supabase';

// Mirrors the exact status mapping paygate-return/payfast-return already
// use server-side: 'success' means "no longer pending_payment and not
// cancelled" — a successful notify moves a booking to
// awaiting_host_confirmation, not straight to 'confirmed' (see
// confirm_booking_payment in supabase/schema.sql). Deliberately never
// reads PayGate's own claimed TRANSACTION_STATUS or a deep link's status
// query param — a browser/OS-level return is not proof of payment on its
// own, only this booking's own current DB row is.
export async function fetchPaymentOutcome(bookingId: string): Promise<'success' | 'pending' | 'failed'> {
  try {
    const { data: booking } = await supabase
      .from('bookings').select('status').eq('id', bookingId).single();
    if (!booking?.status || booking.status === 'pending_payment') return 'pending';
    if (booking.status === 'cancelled') return 'failed';
    return 'success';
  } catch {
    // Can't verify — fail closed the same way paygate-return's own
    // genericResponse() does: never resolve an unverifiable outcome to
    // 'success'.
    return 'pending';
  }
}

// Separate from fetchPaymentOutcome deliberately — that function's 3-way
// success/pending/failed signal is a payment-verification result (payment
// succeeded means "no longer pending_payment and not cancelled", covering
// both awaiting_host_confirmation and confirmed alike), not a booking-state
// signal. Callers that need to tell those two apart — e.g. to decide whether
// showing the drop-off PIN is actually correct yet — read the raw status
// via this instead, rather than overloading fetchPaymentOutcome's contract
// for the one caller that needs the distinction.
export async function fetchBookingStatus(bookingId: string): Promise<string | null> {
  try {
    const { data: booking } = await supabase
      .from('bookings').select('status').eq('id', bookingId).single();
    return booking?.status ?? null;
  } catch {
    return null;
  }
}
