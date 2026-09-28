export const USER_ROLES = ['MEMBER', 'ADMIN', 'SUPPORT', 'MINING_OPERATOR', 'FINANCE_OPERATOR', 'PRODUCT_MANAGER', 'FINANCE_APPROVER', 'MASTER_ADMIN', 'READ_ONLY'] as const;
export type UserRole = typeof USER_ROLES[number];

export const ADMIN_PERMISSIONS = [
  'admin.access',
  'accounts.read', 'accounts.sensitive.read', 'accounts.update', 'accounts.block', 'roles.manage',
  'contracts.read', 'mining.read',
  'products.read', 'products.update', 'products.approve', 'coupons.read', 'coupons.create',
  'rules.read', 'rules.update', 'rules.approve',
  'payments.read', 'payments.reconcile', 'finance.read', 'finance.process',
  'profitSharing.read', 'profitSharing.configure', 'career.read', 'career.close',
  'tickets.read', 'tickets.respond',
  'integrations.read', 'integrations.payments.read', 'integrations.mining.read',
  'audit.read',
] as const;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

const READ_PERMISSIONS = ADMIN_PERMISSIONS.filter(permission => permission === 'admin.access' || permission.endsWith('.read'));
export const ROLE_PERMISSIONS: Record<UserRole, readonly AdminPermission[]> = {
  MEMBER: [],
  // Existing ADMIN accounts retain their explicitly established legacy access.
  ADMIN: ADMIN_PERMISSIONS,
  SUPPORT: ['admin.access', 'accounts.read', 'contracts.read', 'tickets.read', 'tickets.respond'],
  MINING_OPERATOR: ['admin.access', 'contracts.read', 'mining.read', 'integrations.mining.read'],
  FINANCE_OPERATOR: ['admin.access', 'payments.read', 'payments.reconcile', 'finance.read', 'finance.process', 'profitSharing.read', 'career.read', 'integrations.payments.read'],
  PRODUCT_MANAGER: ['admin.access', 'products.read', 'products.update', 'coupons.read', 'coupons.create', 'rules.read', 'rules.update'],
  FINANCE_APPROVER: ['admin.access', 'products.read', 'products.approve', 'coupons.read', 'rules.read', 'rules.approve', 'payments.read', 'finance.read', 'profitSharing.read', 'profitSharing.configure', 'career.read', 'career.close', 'audit.read'],
  MASTER_ADMIN: ADMIN_PERMISSIONS,
  READ_ONLY: READ_PERMISSIONS,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Participante', ADMIN: 'Administrador legado', SUPPORT: 'Suporte',
  MINING_OPERATOR: 'Operação de mineração', FINANCE_OPERATOR: 'Financeiro / conciliação',
  PRODUCT_MANAGER: 'Gestor de produtos', FINANCE_APPROVER: 'Aprovador financeiro',
  MASTER_ADMIN: 'Administrador mestre', READ_ONLY: 'Administrador de leitura',
};
export const ADMIN_ROLE_OPTIONS = USER_ROLES.map(value => ({ value, label: ROLE_LABELS[value] }));
export const isUserRole = (value: unknown): value is UserRole => typeof value === 'string' && USER_ROLES.includes(value as UserRole);

/** An invalid explicit assignment fails closed instead of inheriting legacy ADMIN. */
export function resolveRole(legacyRole: unknown, adminRole?: unknown): UserRole {
  const selected = adminRole == null ? legacyRole : adminRole;
  return isUserRole(selected) ? selected : 'MEMBER';
}
export const permissionsForRole = (role: UserRole): AdminPermission[] => [...ROLE_PERMISSIONS[role]];
export interface AccessSubject { role: UserRole; status?: 'ACTIVE' | 'BLOCKED'; }
export function hasPermission(subject: AccessSubject | null | undefined, permission: AdminPermission): boolean {
  return !!subject && subject.status !== 'BLOCKED' && ROLE_PERMISSIONS[subject.role]?.includes(permission) === true;
}
export const canAccessAdmin = (subject: AccessSubject | null | undefined): boolean => hasPermission(subject, 'admin.access');

export const ADMIN_TABS = [
  { id: 'rules', label: 'Regras', permissions: ['rules.read'] },
  { id: 'plans', label: 'Planos & cupons', permissions: ['products.read', 'coupons.read'] },
  { id: 'users', label: 'Participantes', permissions: ['accounts.read'] },
  { id: 'mining', label: 'Contratos & mineração', permissions: ['contracts.read', 'mining.read'] },
  { id: 'finance', label: 'Financeiro', permissions: ['finance.read', 'payments.read', 'profitSharing.read', 'career.read'] },
  { id: 'support', label: 'Atendimento', permissions: ['tickets.read'] },
  { id: 'integrations', label: 'Integrações', permissions: ['integrations.read', 'integrations.payments.read', 'integrations.mining.read'] },
  { id: 'audit', label: 'Auditoria', permissions: ['audit.read'] },
] as const satisfies readonly { id: string; label: string; permissions: readonly AdminPermission[] }[];
export const adminTabsFor = (subject: AccessSubject | null | undefined) => ADMIN_TABS.filter(tab => tab.permissions.some(permission => hasPermission(subject, permission)));
