// ロール管理ユーティリティ
// 現在のDBスキーマではrolesテーブルのidはシンプルなtext型（'admin', 'mentor', 'student'）
export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

// 既知のロール情報（シンプルIDマッピング）
export const KNOWN_ROLES: Record<string, RoleInfo> = {
  'admin': {
    id: 'admin',
    name: 'admin',
    displayName: '管理者',
    description: 'システム管理者ロール'
  },
  'mentor': {
    id: 'mentor',
    name: 'mentor',
    displayName: 'メンター',
    description: 'レッスンを提供するメンター'
  },
  'student': {
    id: 'student',
    name: 'student',
    displayName: '生徒',
    description: '学習者ロール'
  }
};

// ロール名の正規化
export function normalizeRoleName(role: string | undefined | null): string {
  if (!role) return 'student';
  
  const normalized = String(role).toLowerCase().trim();
  
  // 既知のロールIDから直接取得
  if (KNOWN_ROLES[normalized]) {
    return KNOWN_ROLES[normalized].name;
  }
  
  // 文字列の場合は直接判定（後方互換性のため）
  if (normalized === 'mentor') return 'mentor';
  if (normalized === 'admin' || normalized === 'administrator') return 'admin';
  if (normalized === 'student') return 'student';
  
  // デフォルトは生徒ロール
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
  role?: { name?: string } | string;
  roleId?: string;
}): string {
  // 1. roleName を最優先で使用
  if (userData.roleName) {
    return normalizeRoleName(userData.roleName);
  }
  
  // 2. role.name または role文字列を次に使用
  if (userData.role) {
    if (typeof userData.role === 'string') {
      return normalizeRoleName(userData.role);
    } else if (userData.role.name) {
      return normalizeRoleName(userData.role.name);
    }
  }
  
  // 3. roleId を最後に使用（現在はシンプルID）
  if (userData.roleId) {
    return normalizeRoleName(userData.roleId);
  }
  
  return 'student';
}

// キャッシュ更新の状態を管理
let rolesCacheInitialized = false;

// 動的にロール情報を取得してキャッシュを更新
export async function updateRoleCache(): Promise<void> {
  // すでに初期化済みならスキップ
  if (rolesCacheInitialized) {
    return;
  }

  try {
    const response = await fetch('/api/roles');
    if (response.ok) {
      const roles = await response.json();
      
      // 既知のロール情報を更新（シンプルID構造対応）
      roles.forEach((role: { id: string; name: string; description?: string }) => {
        const roleId = role.id.toLowerCase();
        KNOWN_ROLES[roleId] = {
          id: roleId,
          name: role.name.toLowerCase(),
          displayName: getRoleDisplayName(role.name),
          description: role.description
        };
      });
      
      // 初期化フラグを設定
      rolesCacheInitialized = true;
      console.log('ロールキャッシュを更新しました:', Object.keys(KNOWN_ROLES));
    }
  } catch (error) {
    console.warn('ロール情報の取得に失敗しました:', error);
  }
} 