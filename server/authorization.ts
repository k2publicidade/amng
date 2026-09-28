import { canAccessAdmin, hasPermission, permissionsForRole, resolveRole, type AdminPermission } from '../shared/permissions.ts';
import type { Executor, Row } from './database.ts';
import { reject } from './domain.ts';

export const effectiveRole = (user: Row) => resolveRole(user.role, user.admin_role);
export const authorizationSubject = (user: Row) => ({ role: effectiveRole(user), status: Number(user.blocked) === 1 ? 'BLOCKED' as const : 'ACTIVE' as const });
export const permissionsForUser = (user: Row) => Number(user.blocked) === 1 ? [] : permissionsForRole(effectiveRole(user));
export const userHasPermission = (user: Row, permission: AdminPermission) => hasPermission(authorizationSubject(user), permission);
export function requireAdminAccess(user: Row): Row {
  if (!canAccessAdmin(authorizationSubject(user))) reject(403, 'ADMIN_REQUIRED', 'Esta ação exige acesso administrativo autorizado.');
  return user;
}
export function requirePermission(user: Row, permission: AdminPermission): Row {
  requireAdminAccess(user);
  if (!userHasPermission(user, permission)) reject(403, 'PERMISSION_REQUIRED', 'Seu papel não permite esta ação administrativa.');
  return user;
}

/** Mutation callers lock the identity first, then revalidate persisted scope, role and block state. */
export async function freshAdministrativeActor(tx: Executor, actor: Row, permission: AdminPermission, lock = false): Promise<Row> {
  if (lock) await tx.lockUser(String(actor.id));
  const fresh = await tx.get('SELECT * FROM users WHERE id=?', [String(actor.id)]);
  if (!fresh || Number(fresh.blocked) === 1 || fresh.scope !== actor.scope || Number(fresh.is_demo) !== Number(actor.is_demo)) reject(403, 'ADMIN_ACCESS_REVOKED', 'Seu acesso administrativo foi atualizado. Entre novamente.');
  return requirePermission(fresh, permission);
}
