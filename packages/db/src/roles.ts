/** BRD §2.1 system role keys and default permissions. */

export const ROLE_KEYS = {
  PLATFORM_SUPER_ADMIN: "platform_super_admin",
  COMPANY_SUPER_ADMIN: "company_super_admin",
  COMPANY_ADMIN: "company_admin",
  SUSTAINABILITY_MANAGER: "sustainability_manager",
  DATA_ENTRY: "data_entry",
  ANALYST: "analyst",
  VIEWER: "viewer",
  AUDITOR: "auditor",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const PERMISSIONS = {
  TENANT_CREATE: "tenant:create",
  TENANT_MANAGE: "tenant:manage",
  USER_READ: "user:read",
  USER_MANAGE: "user:manage",
  USER_INVITE: "user:invite",
  ROLE_ASSIGN: "role:assign",
  ORG_READ: "org:read",
  ORG_MANAGE: "org:manage",
  AUDIT_READ: "audit:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleSeed = {
  key: RoleKey;
  name: string;
  description: string;
  permissions: Permission[];
  /** Platform-only role (no tenantId when seeded as catalog). */
  platformOnly?: boolean;
};

export const SYSTEM_ROLES: RoleSeed[] = [
  {
    key: ROLE_KEYS.PLATFORM_SUPER_ADMIN,
    name: "Platform Super Admin",
    description: "Platform yönetimi; müşteri verisine varsayılan sınırsız erişim yok",
    permissions: [
      PERMISSIONS.TENANT_CREATE,
      PERMISSIONS.TENANT_MANAGE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.AUDIT_READ,
    ],
    platformOnly: true,
  },
  {
    key: ROLE_KEYS.COMPANY_SUPER_ADMIN,
    name: "Company Super Admin",
    description: "Firma üst yöneticisi",
    permissions: [
      PERMISSIONS.TENANT_MANAGE,
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.USER_INVITE,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.ORG_MANAGE,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    key: ROLE_KEYS.COMPANY_ADMIN,
    name: "Company Admin",
    description: "Firma yöneticisi — kullanıcı ve org yönetimi",
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.USER_INVITE,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.ORG_MANAGE,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    key: ROLE_KEYS.SUSTAINABILITY_MANAGER,
    name: "Sustainability Manager",
    description: "Sürdürülebilirlik yöneticisi",
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.ORG_READ,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    key: ROLE_KEYS.DATA_ENTRY,
    name: "Data Entry",
    description: "Veri girişi (Phase 2+)",
    permissions: [PERMISSIONS.ORG_READ],
  },
  {
    key: ROLE_KEYS.ANALYST,
    name: "Analyst",
    description: "Analist",
    permissions: [PERMISSIONS.ORG_READ, PERMISSIONS.AUDIT_READ],
  },
  {
    key: ROLE_KEYS.VIEWER,
    name: "Viewer",
    description: "İzleyici / yönetici görünümü",
    permissions: [PERMISSIONS.ORG_READ],
  },
  {
    key: ROLE_KEYS.AUDITOR,
    name: "Auditor",
    description: "Denetçi — salt okunur + audit",
    permissions: [PERMISSIONS.ORG_READ, PERMISSIONS.USER_READ, PERMISSIONS.AUDIT_READ],
  },
];
