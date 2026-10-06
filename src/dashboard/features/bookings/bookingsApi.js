import { supabase } from "../../../lib/supabaseClient";

const TABLE = "bookings";

// Fields from the joined car that the dashboard and contract need.
const SELECT = "*, cars(id, make, model, year, color, owner_name, plate_number)";

// Turns the database's constraint errors into Arabic messages the owner
// can act on. 23P01 = exclusion violation (overlap), 23514 = check
// violation. Anything else keeps its original message.
function toFriendlyError(error) {
  if (error.code === "23P01") {
    return new Error("هذه السيارة محجوزة في هذه الفترة");
  }
  if (error.code === "23514") {
    if (error.message?.includes("bookings_dates_valid")) {
      return new Error("تاريخ الاستلام يجب أن يكون بعد تاريخ التسليم");
    }
    if (error.message?.includes("bookings_amounts_valid")) {
      return new Error("المبالغ وقراءة العداد لا يمكن أن تكون سالبة");
    }
  }
  return error;
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw toFriendlyError(error);
  return data;
}

// Every booking, newest pickup first — cancelled ones included (callers
// decide whether to show them).
export function listBookings() {
  return run(
    supabase.from(TABLE).select(SELECT).order("pickup_date", { ascending: false }),
  );
}

// Non-cancelled bookings that touch the window [rangeStart, rangeEnd]
// ("YYYY-MM-DD", first through last day of the month) — what the timeline
// loads for one month. A booking received back on the first day is still
// loaded, since its bar covers the first half of that day.
export function listBookingsInRange(rangeStart, rangeEnd) {
  return run(
    supabase
      .from(TABLE)
      .select(SELECT)
      .is("cancelled_at", null)
      .lte("pickup_date", rangeEnd)
      .gte("return_date", rangeStart)
      .order("pickup_date", { ascending: true }),
  );
}

export function getBooking(id) {
  return run(supabase.from(TABLE).select(SELECT).eq("id", id).single());
}

// Ids of cars that already have a non-cancelled booking overlapping
// [pickupDate, returnDate) — same rule as the database constraint, so a
// car received back on `pickupDate` can be delivered again that day (an
// existing booking conflicts only if existing.pickup < returnDate AND
// existing.return > pickupDate). `excludeId` skips the booking being
// edited. Used by the form to flag unavailable cars; the constraint stays
// the real enforcement.
export async function listBookedCarIds(pickupDate, returnDate, excludeId) {
  let query = supabase
    .from(TABLE)
    .select("car_id")
    .is("cancelled_at", null)
    .lt("pickup_date", returnDate)
    .gt("return_date", pickupDate);
  if (excludeId) query = query.neq("id", excludeId);
  const data = await run(query);
  return new Set(data.map((row) => row.car_id));
}

export function createBooking(values) {
  return run(supabase.from(TABLE).insert(values).select(SELECT).single());
}

export function updateBooking(id, values) {
  return run(
    supabase.from(TABLE).update(values).eq("id", id).select(SELECT).single(),
  );
}

export async function deleteBooking(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw toFriendlyError(error);
}

// Cancelled bookings stay in the database but stop blocking the car.
export function cancelBooking(id) {
  return updateBooking(id, { cancelled_at: new Date().toISOString() });
}

// Can fail with the overlap message if the car was booked meanwhile.
export function restoreBooking(id) {
  return updateBooking(id, { cancelled_at: null });
}

// "تم الاستلام": the car is back. `returnedOn` is "YYYY-MM-DD".
export function markReturned(id, returnedOn) {
  return updateBooking(id, { returned_on: returnedOn });
}

export function unmarkReturned(id) {
  return updateBooking(id, { returned_on: null });
}
