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
