-- Read-only checks to run BEFORE migrations/0005. Both queries must
-- return zero rows. Nothing here changes data.

-- Check 1: invalid ranges (return on or before pickup).
-- Fix: update bookings set return_date = pickup_date + 1 where id = '...';
select id, car_id, customer_name, pickup_date, return_date
from bookings
where return_date <= pickup_date;

-- Check 2: overlapping bookings for the same car, [pickup, return) rule.
-- Fix: correct the dates, delete the duplicate, or (after 0004) cancel it:
--   update bookings set cancelled_at = now() where id = '...';
select a.id as booking_a, b.id as booking_b, a.car_id,
       a.customer_name as customer_a, a.pickup_date as a_pickup, a.return_date as a_return,
       b.customer_name as customer_b, b.pickup_date as b_pickup, b.return_date as b_return
from bookings a
join bookings b
  on a.car_id = b.car_id
 and a.id < b.id
 and a.pickup_date < b.return_date
 and b.pickup_date < a.return_date
where a.return_date > a.pickup_date
  and b.return_date > b.pickup_date;
