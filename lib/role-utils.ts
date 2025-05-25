// ロール管理ユーティリティ
export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

// 既知のロール情報（UUIDマッピング）
export const KNOWN_ROLES: Record<string, RoleInfo> = {
  '127f103f-f296-447c-81d4-b4c2f12f826e': {
    id: '127f103f-f296-447c-81d4-b4c2f12f826e',
    name: 'mentor',
    displayName: 'メンター',
    description: 'レッスンを提供するメンター'
  },
  // 他のロールUUIDがあればここに追加
};

// ロール名の正規化
export function normalizeRoleName(role: string | undefined | null): string {
  if (!role) return 'student';
  
  const normalized = String(role).toLowerCase().trim();
  
  // UUIDかどうかをチェック
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
  
  if (isUuid) {
    // 既知のUUIDから名前を取得
    const knownRole = KNOWN_ROLES[normalized];
    return knownRole ? knownRole.name : 'student';
  }
  
  // 文字列の場合は直接判定
  if (normalized === 'mentor') return 'mentor';
  if (normalized === 'admin' || normalized === 'administrator') return 'admin';
  
  return 'student';
}

// ロール表示名を取得
export function getRoleDisplayName(role: string): string {
  const normalizedRole = normalizeRoleName(role);
  
  switch (normalizedRole) {
    case 'mentor':
      return 'メンター';
    case 'admin':
      return '管理者';
    case 'student':
    default:
      return '生徒';
  }
}

// ロールの権限チェック
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const normalizedUserRole = normalizeRoleName(userRole);
  const normalizedRequiredRole = normalizeRoleName(requiredRole);
  
  // 管理者は全ての権限を持つ
  if (normalizedUserRole === 'admin') return true;
  
  // メンターはメンター権限を持つ
  if (normalizedUserRole === 'mentor' && normalizedRequiredRole === 'mentor') return true;
  
  // 生徒は生徒権限のみ
  if (normalizedUserRole === 'student' && normalizedRequiredRole === 'student') return true;
  
  return false;
}

// APIレスポンスからロール情報を抽出
export function extractRoleFromApiResponse(userData: {
  roleName?: string;
  role?: { name?: string };
  roleId?: string;
}): string {
  // 1. roleName を最優先で使用
  if (userData.roleName) {
    return normalizeRoleName(userData.roleName);
  }
  
  // 2. role.name を次に使用
  if (userData.role?.name) {
    return normalizeRoleName(userData.role.name);
  }
  
  // 3. roleId を最後に使用
  if (userData.roleId) {
    return normalizeRoleName(userData.roleId);
  }
  
  return 'student';
}

// 動的にロール情報を取得してキャッシュを更新
export async function updateRoleCache(): Promise<void> {
  try {
    const response = await fetch('/api/roles');
    if (response.ok) {
      const roles = await response.json();
      
      // 既知のロール情報を更新
      roles.forEach((role: { id: string; name: string; description?: string }) => {
        KNOWN_ROLES[role.id] = {
          id: role.id,
          name: role.name.toLowerCase(),
          displayName: getRoleDisplayName(role.name),
          description: role.description
        };
      });
      
      console.log('ロールキャッシュを更新しました:', Object.keys(KNOWN_ROLES));
    }
  } catch (error) {
    console.warn('ロール情報の取得に失敗しました:', error);
  }
} 