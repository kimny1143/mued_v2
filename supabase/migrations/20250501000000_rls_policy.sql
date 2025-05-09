-- Enable Row Level Security for users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see and update their own data
CREATE POLICY "Users can view and update their own data" 
ON "users"
FOR ALL
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Create policy for admins to view and manage all users
CREATE POLICY "Admins can view and manage all users" 
ON "users"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "users" u 
    WHERE u.id = auth.uid()::text 
    AND u."roleId" = 'admin'
  )
);

-- Enable Row Level Security for stripe_user_subscriptions table
ALTER TABLE "stripe_user_subscriptions" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own subscription data
CREATE POLICY "Users can view their own stripe_user_subscriptions" 
ON "stripe_user_subscriptions"
FOR SELECT
USING (auth.uid()::text = user_id);

-- Allow admins to view all subscription data (optional, if needed)
-- CREATE POLICY "Admins can view all stripe_user_subscriptions" 
-- ON "stripe_user_subscriptions"
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM "users" u -- Assuming your users table is named 'users'
--     WHERE u.id = auth.uid()::text 
--     AND u."roleId" = 'admin'
--   )
-- );

-- Initialize default roles
INSERT INTO "roles" (id, name, description)
VALUES 
  ('admin', 'Administrator', 'Full system access'),
  ('mentor', 'Mentor', 'Can manage courses and students'),
  ('student', 'Student', 'Regular user with limited access')
ON CONFLICT (id) DO NOTHING;

-- Insert default permissions
INSERT INTO "permissions" (id, name, "roleId")
VALUES 
  (gen_random_uuid(), 'user:read', 'admin'),
  (gen_random_uuid(), 'user:write', 'admin'),
  (gen_random_uuid(), 'course:read', 'admin'),
  (gen_random_uuid(), 'course:write', 'admin'),
  (gen_random_uuid(), 'course:read', 'mentor'),
  (gen_random_uuid(), 'course:write', 'mentor'),
  (gen_random_uuid(), 'student:read', 'mentor'),
  (gen_random_uuid(), 'course:read', 'student'); 