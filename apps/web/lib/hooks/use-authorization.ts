"use client";

import { useMemo } from "react";

import { useUser } from "./use-user";

export type UserRole = "student" | "mentor" | "admin" | "unknown";

/**
 * useAuthorization
 * ------------------------------------
 * ログインユーザーの role_id を判定し、ロール別のブール値と
 * 権限チェック関数を返すユーティリティフック。
 *
 * - 既存の `useUser()` フックをラップし、`role_id` が取得できない場合は
 *   "unknown" を返す。
 * - フックはメモ化された値を返すため、再レンダリングコストを抑えられる。
 */
export function useAuthorization() {
  const { user, loading } = useUser();

  const role: UserRole = useMemo(() => {
    if (loading || !user?.role_id) return "unknown";
    switch (user.role_id.toLowerCase()) {
      case "mentor":
        return "mentor";
      case "admin":
        return "admin";
      case "student":
        return "student";
      default:
        return "unknown";
    }
  }, [user?.role_id, loading]);

  const isStudent = role === "student";
  const isMentor = role === "mentor";
  const isAdmin = role === "admin";

  /**
   * hasRole
   * --------------------------------
   * 指定されたロールをユーザーが持つかどうかを判定するヘルパー。
   * 複数ロールを渡した場合、いずれかに一致すれば true。
   */
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (Array.isArray(roles)) {
      return roles.includes(role);
    }
    return role === roles;
  };

  return {
    role,
    isStudent,
    isMentor,
    isAdmin,
    hasRole,
    loading,
  } as const;
} 