/*
  # Fix Stripe Schema Constraints

  1. Changes
    - Remove foreign key constraint from stripe_customers to auth.users
    - Add new foreign key with ON DELETE CASCADE
    - Update RLS policies to handle null cases

  2. Security
    - Maintains existing RLS policies
    - Updates policy conditions for better null handling
*/

-- Drop the existing foreign key constraint
ALTER TABLE stripe_customers
DROP CONSTRAINT IF EXISTS stripe_customers_user_id_fkey;

-- Re-add the foreign key with CASCADE delete
ALTER TABLE stripe_customers
ADD CONSTRAINT stripe_customers_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Update the RLS policy to handle null cases more gracefully
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;

CREATE POLICY "Users can view their own customer data"
ON stripe_customers
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid() OR user_id IS NULL)
  AND deleted_at IS NULL
);