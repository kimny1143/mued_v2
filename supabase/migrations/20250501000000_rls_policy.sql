-- Enable Row Level Security for users table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see and update their own data
CREATE POLICY "Users can view and update their own data" 
ON "User"
FOR ALL
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Create policy for admins to view and manage all users
CREATE POLICY "Admins can view and manage all users" 
ON "User"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "User" u 
    WHERE u.id = auth.uid()::text 
    AND u."roleId" = 'admin'
  )
);

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