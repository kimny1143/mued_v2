-- glasswerkskimny@gmail.com のロール確認用クエリ（修正版）

-- 1. usersテーブルの基本情報確認
SELECT 
    id,
    email,
    name,
    role_id
FROM users
WHERE email = 'glasswerkskimny@gmail.com';

-- 2. rolesテーブルとJOINして実際のロール名を確認
SELECT 
    u.id AS user_id,
    u.email,
    u.name,
    u.role_id AS user_role_id,
    r.id AS role_id,
    r.name AS role_name,
    r.description AS role_description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'glasswerkskimny@gmail.com';

-- 3. 全ロールの確認
SELECT 
    id,
    name,
    description
FROM roles
ORDER BY id;

-- 4. メンターロールのユーザー数確認
SELECT COUNT(*) as mentor_count
FROM users
WHERE role_id = 'mentor';

-- 5. 現在のロール分布
SELECT 
    r.name AS role_name,
    COUNT(u.id) AS user_count
FROM roles r
LEFT JOIN users u ON u.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;