/** Canonical permission catalogue. Seeded into the Permission table. */
export const PERMISSIONS_CATALOGUE = {
  'users.read': 'View user accounts',
  'users.write': 'Create, edit and deactivate user accounts',
  'roles.read': 'View roles and permissions',
  'roles.write': 'Change role permissions and assign roles',
  'cms.read': 'View all CMS content including drafts',
  'cms.write': 'Create and edit CMS content',
  'cms.publish': 'Publish, unpublish and archive CMS content',
  'settings.write': 'Edit institutional site settings',
  'admissions.read': 'View applications',
  'admissions.review': 'Review applications and verify documents',
  'admissions.decide': 'Approve or reject applications',
  'payments.read': 'View payment records',
  'engagement.read': 'View contact messages and newsletter subscribers',
  'audit.read': 'View staff action trail',
  'security.read': 'View staff login history',
  'dashboard.read': 'View admin dashboard',
  'academics.manage': 'Manage programmes, curricula and eligibility rules',
  'lms.manage': 'Manage online courses: pricing, video lessons, notes and quizzes',
  'live.host': 'Schedule, start and record live classes',
  'teach.own': 'Teacher dashboard: own courses, student progress and live classes',
  'department.lead': 'Head of department: overview of the own department',
  'hr.manage': 'HR overview and staff leave approvals',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS_CATALOGUE;
const ALL = Object.keys(PERMISSIONS_CATALOGUE) as PermissionKey[];

export const ROLE_DEFINITIONS: { key: string; nameEn: string; nameAr: string; permissions: PermissionKey[] }[] = [
  { key: 'SUPER_ADMIN', nameEn: 'Super Admin', nameAr: 'مدير النظام الأعلى', permissions: ALL },
  {
    key: 'UNIVERSITY_ADMIN', nameEn: 'University Administrator', nameAr: 'إداري الجامعة',
    permissions: ['dashboard.read', 'users.read', 'roles.read', 'cms.read', 'cms.write', 'cms.publish', 'settings.write', 'admissions.read', 'payments.read', 'engagement.read', 'audit.read', 'security.read', 'academics.manage', 'lms.manage', 'live.host', 'teach.own', 'department.lead', 'hr.manage'],
  },
  { key: 'ADMISSIONS_OFFICER', nameEn: 'Admissions Officer', nameAr: 'مسؤول القبول', permissions: ['admissions.read', 'admissions.review', 'admissions.decide', 'payments.read', 'academics.manage'] },
  { key: 'ADMISSIONS_REVIEWER', nameEn: 'Admissions Reviewer', nameAr: 'مراجع القبول', permissions: ['admissions.read', 'admissions.review'] },
  { key: 'REGISTRAR', nameEn: 'Registrar', nameAr: 'المسجل', permissions: ['admissions.read'] },
  { key: 'ACADEMIC_ADMIN', nameEn: 'Academic Administrator', nameAr: 'الإداري الأكاديمي', permissions: ['cms.read', 'cms.write', 'academics.manage', 'lms.manage', 'live.host', 'teach.own'] },
  { key: 'FINANCE_MANAGER', nameEn: 'Finance Manager', nameAr: 'مدير المالية', permissions: ['payments.read'] },
  { key: 'FINANCE_OFFICER', nameEn: 'Finance Officer', nameAr: 'موظف المالية', permissions: ['payments.read'] },
  { key: 'HR_MANAGER', nameEn: 'HR Manager', nameAr: 'مدير الموارد البشرية', permissions: ['hr.manage', 'users.read'] },
  { key: 'HEAD_OF_DEPARTMENT', nameEn: 'Head of Department', nameAr: 'رئيس القسم', permissions: ['department.lead', 'teach.own', 'live.host'] },
  { key: 'CONTENT_EDITOR', nameEn: 'Content Editor', nameAr: 'محرر المحتوى', permissions: ['cms.read', 'cms.write', 'engagement.read'] },
  { key: 'FACULTY', nameEn: 'Teacher', nameAr: 'المعلم', permissions: ['teach.own', 'live.host'] },
  { key: 'STUDENT', nameEn: 'Student', nameAr: 'طالب', permissions: [] },
  { key: 'APPLICANT', nameEn: 'Applicant', nameAr: 'متقدم', permissions: [] },
];

/** Roles that may sign in to the admin panel (any staff permission). */
export const STAFF_ROLES = ROLE_DEFINITIONS.filter((r) => r.permissions.length > 0).map((r) => r.key);

/** Admins see every course; teachers only the courses assigned to them. */
export const seesAllCourses = (perms: string[]) => perms.includes('lms.manage');
