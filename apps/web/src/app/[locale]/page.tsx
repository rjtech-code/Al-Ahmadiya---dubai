import Image from 'next/image';
import {
  ArrowRight, BookOpen, BookOpenCheck, BriefcaseBusiness, Building2, CalendarDays,
  CheckCircle2, ClipboardCheck, CreditCard, FileCheck2, GraduationCap, LibraryBig,
  LockKeyhole, MessageSquareText, MonitorCog, Radio, ScrollText, Settings2,
  ShieldCheck, ShoppingCart, Users, Wallet, Globe2, ChartNoAxesCombined
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { heritageImage, initPage, type LocaleParams } from '@/lib/page';
import { JsonLd, pageMetadata, SITE_URL } from '@/lib/seo';
import { api } from '@/lib/api';

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  return pageMetadata({ locale, path: '/' });
}

type Copy = { en: string; ar: string };
type Feature = { icon: LucideIcon; title: Copy; body: Copy; points: Copy[]; href?: string };
type StaffRole = { key: string; title: string; body: Copy; icon: LucideIcon };

const roles: StaffRole[] = [
  { key: 'SUPER_ADMIN', title: 'Super Admin', icon: ShieldCheck, body: { en: 'Full platform oversight, user and role administration, security records, institutional settings and every operational module.', ar: 'إشراف كامل على المنصة والمستخدمين والأدوار وسجلات الأمان والإعدادات وجميع الوحدات التشغيلية.' } },
  { key: 'UNIVERSITY_ADMIN', title: 'University Administrator', icon: Building2, body: { en: 'Coordinates institution-wide operations across admissions, academics, finance, HR, registrar, library, procurement and website content.', ar: 'تنسيق العمليات المؤسسية عبر القبول والشؤون الأكاديمية والمالية والموارد البشرية والسجل والمكتبة والمشتريات ومحتوى الموقع.' } },
  { key: 'ADMISSIONS_OFFICER', title: 'Admissions Officer', icon: ClipboardCheck, body: { en: 'Reviews applications, verifies documents, records admission decisions and checks related programme and payment information.', ar: 'مراجعة الطلبات والتحقق من المستندات وتسجيل قرارات القبول ومراجعة معلومات البرامج والمدفوعات ذات الصلة.' } },
  { key: 'ADMISSIONS_REVIEWER', title: 'Admissions Reviewer', icon: FileCheck2, body: { en: 'Checks submitted applications and supporting documents, and flags missing information or corrections for applicants.', ar: 'فحص طلبات التقديم والمستندات الداعمة وتحديد المعلومات الناقصة أو التصحيحات المطلوبة.' } },
  { key: 'REGISTRAR', title: 'Registrar', icon: ScrollText, body: { en: 'Manages student registration records, prerequisite checks, credit audits and academic transcripts.', ar: 'إدارة سجلات تسجيل الطلاب والتحقق من المتطلبات السابقة ومراجعة الساعات والسجلات الأكاديمية.' } },
  { key: 'LIBRARIAN', title: 'Librarian', icon: LibraryBig, body: { en: 'Maintains the library catalogue and manages book issue and return workflows.', ar: 'إدارة فهرس المكتبة وعمليات إعارة الكتب وإعادتها.' } },
  { key: 'PROCUREMENT_OFFICER', title: 'Procurement & Operations', icon: ShoppingCart, body: { en: 'Raises and tracks purchase requests, reviews approvals, monitors committed budgets and updates campus facility status.', ar: 'إنشاء ومتابعة طلبات الشراء ومراجعة الموافقات ومراقبة الميزانيات وتحديث حالة مرافق الحرم.' } },
  { key: 'ACADEMIC_ADMIN', title: 'Academic Administrator', icon: BookOpen, body: { en: 'Maintains programmes and eligibility, manages online courses and live classes, and supports teaching operations.', ar: 'إدارة البرامج وشروط الأهلية والمقررات الإلكترونية والفصول المباشرة ودعم العمليات التعليمية.' } },
  { key: 'FINANCE_MANAGER', title: 'Finance Manager', icon: Wallet, body: { en: 'Reviews payment records, collections, outstanding balances, student dues and finance reporting.', ar: 'مراجعة سجلات المدفوعات والتحصيل والأرصدة المستحقة ورسوم الطلاب والتقارير المالية.' } },
  { key: 'FINANCE_OFFICER', title: 'Finance Officer', icon: CreditCard, body: { en: 'Works with payment records, receipts, student fee status and outstanding payment follow-up.', ar: 'متابعة سجلات المدفوعات والإيصالات وحالة الرسوم والمدفوعات المستحقة.' } },
  { key: 'HR_MANAGER', title: 'HR Manager', icon: BriefcaseBusiness, body: { en: 'Oversees staff records and handles leave requests, approvals and HR administration.', ar: 'الإشراف على سجلات الموظفين وإدارة طلبات الإجازات والموافقات وشؤون الموارد البشرية.' } },
  { key: 'HEAD_OF_DEPARTMENT', title: 'Head of Department', icon: Users, body: { en: 'Views the assigned department, supports its teaching activity and coordinates departmental live classes.', ar: 'متابعة القسم المخصص ودعم أنشطته التعليمية وتنسيق الفصول المباشرة.' } },
  { key: 'CONTENT_EDITOR', title: 'Content Editor', icon: MessageSquareText, body: { en: 'Creates and edits bilingual website content and reviews incoming contact messages and newsletter engagement.', ar: 'إنشاء وتحرير محتوى الموقع باللغتين ومراجعة رسائل التواصل واشتراكات النشرة.' } },
  { key: 'FACULTY', title: 'Teacher / Faculty', icon: GraduationCap, body: { en: 'Works with assigned courses, student progress, attendance, assignments, grading and live teaching sessions.', ar: 'إدارة المقررات المخصصة ومتابعة تقدم الطلاب والحضور والواجبات والتقييم والحصص المباشرة.' } },
];

const modules: Feature[] = [
  { icon: ChartNoAxesCombined, title: { en: 'Dashboards & oversight', ar: 'لوحات المعلومات والإشراف' }, body: { en: 'Role-specific workspaces surface the figures, alerts and tasks relevant to each authorised team.', ar: 'تعرض مساحات العمل الخاصة بكل دور المؤشرات والتنبيهات والمهام المناسبة للفريق المصرح له.' }, points: [{ en: 'Institution and department summaries', ar: 'ملخصات المؤسسة والأقسام' }, { en: 'Operational alerts and quick actions', ar: 'تنبيهات تشغيلية وإجراءات سريعة' }, { en: 'Recent activity and reporting', ar: 'النشاط الأخير والتقارير' }] },
  { icon: GraduationCap, title: { en: 'Admissions & applicant journey', ar: 'القبول ورحلة المتقدم' }, body: { en: 'Follow applications from submission through document review, correction requests and final decisions.', ar: 'متابعة الطلبات من التقديم إلى مراجعة المستندات وطلبات التصحيح والقرارات النهائية.' }, points: [{ en: 'Search and filter applications by status', ar: 'البحث والتصفية حسب حالة الطلب' }, { en: 'Review documents and applicant details', ar: 'مراجعة المستندات وبيانات المتقدم' }, { en: 'Approve, reject or return for correction by permission', ar: 'الموافقة أو الرفض أو طلب التصحيح وفق الصلاحية' }] , href: '/admissions' },
  { icon: BookOpenCheck, title: { en: 'Academics, courses & live classes', ar: 'الشؤون الأكاديمية والمقررات والفصول المباشرة' }, body: { en: 'Organise programmes, eligibility rules, online course content and scheduled teaching sessions.', ar: 'تنظيم البرامج وشروط الأهلية ومحتوى المقررات الإلكترونية والحصص التعليمية المجدولة.' }, points: [{ en: 'Programme and curriculum administration', ar: 'إدارة البرامج والمناهج' }, { en: 'Lessons, notes, quizzes and timetables', ar: 'الدروس والملاحظات والاختبارات والجداول' }, { en: 'Schedule, host and record live classes', ar: 'جدولة واستضافة وتسجيل الفصول المباشرة' }] , href: '/programs' },
  { icon: ScrollText, title: { en: 'Registrar & student records', ar: 'السجل الأكاديمي وسجلات الطلاب' }, body: { en: 'Keep registration and academic progression records organised and traceable.', ar: 'تنظيم سجلات التسجيل والتقدم الأكاديمي وإمكانية تتبعها.' }, points: [{ en: 'Registration and student record lookup', ar: 'التسجيل والبحث في سجلات الطلاب' }, { en: 'Prerequisite and credit audits', ar: 'مراجعة المتطلبات والساعات المعتمدة' }, { en: 'Academic transcript workflows', ar: 'إجراءات السجلات الأكاديمية' }] },
  { icon: Wallet, title: { en: 'Finance & payments', ar: 'المالية والمدفوعات' }, body: { en: 'Monitor payment activity and fee status with student-level details and receipts.', ar: 'متابعة حركة المدفوعات وحالة الرسوم مع تفاصيل الطلاب والإيصالات.' }, points: [{ en: 'Collections and monthly summaries', ar: 'التحصيل والملخصات الشهرية' }, { en: 'Outstanding dues and ageing', ar: 'المستحقات المتأخرة ومدد التأخير' }, { en: 'Payment history and receipts', ar: 'سجل المدفوعات والإيصالات' }] },
  { icon: BriefcaseBusiness, title: { en: 'HR & staff leave', ar: 'الموارد البشرية وإجازات الموظفين' }, body: { en: 'Support staff administration and a clear leave request and approval process.', ar: 'دعم إدارة الموظفين وتوفير إجراءات واضحة لطلبات الإجازات والموافقة عليها.' }, points: [{ en: 'Staff directory and account status', ar: 'دليل الموظفين وحالة الحساب' }, { en: 'Annual, sick and casual leave requests', ar: 'طلبات الإجازة السنوية والمرضية والعارضة' }, { en: 'HR review and leave decisions', ar: 'مراجعة الموارد البشرية وقرارات الإجازات' }] },
  { icon: LibraryBig, title: { en: 'Library services', ar: 'خدمات المكتبة' }, body: { en: 'Maintain library resources and track lending activity.', ar: 'إدارة موارد المكتبة وتتبع عمليات الإعارة.' }, points: [{ en: 'Catalogue maintenance', ar: 'إدارة الفهرس' }, { en: 'Book issue and return', ar: 'إعارة الكتب وإعادتها' }, { en: 'Circulation records', ar: 'سجلات تداول الكتب' }] },
  { icon: ShoppingCart, title: { en: 'Procurement & campus facilities', ar: 'المشتريات ومرافق الحرم' }, body: { en: 'Bring purchasing requests, approvals, budget commitments and facility status into one workspace.', ar: 'جمع طلبات الشراء والموافقات والتزامات الميزانية وحالة المرافق في مساحة عمل واحدة.' }, points: [{ en: 'Purchase requests and approval steps', ar: 'طلبات الشراء وخطوات الموافقة' }, { en: 'Budget committed and remaining', ar: 'الميزانية الملتزم بها والمتبقية' }, { en: 'Facility operational / maintenance / closed status', ar: 'حالة المرافق: تشغيل أو صيانة أو إغلاق' }] },
  { icon: MonitorCog, title: { en: 'Website CMS & communications', ar: 'إدارة محتوى الموقع والتواصل' }, body: { en: 'Manage bilingual public content with draft, confirmation and publishing controls.', ar: 'إدارة المحتوى العام باللغتين مع ضوابط المسودات والتأكيد والنشر.' }, points: [{ en: 'Edit pages, news, events and content collections', ar: 'تحرير الصفحات والأخبار والفعاليات ومجموعات المحتوى' }, { en: 'Separate editing from publishing permissions', ar: 'فصل صلاحية التحرير عن صلاحية النشر' }, { en: 'Contact messages and newsletter subscribers', ar: 'رسائل التواصل ومشتركو النشرة' }] },
  { icon: ShieldCheck, title: { en: 'Roles, permissions & security', ar: 'الأدوار والصلاحيات والأمان' }, body: { en: 'Control what each staff role can view or change, with access records for oversight.', ar: 'التحكم فيما يمكن لكل دور من الموظفين رؤيته أو تغييره مع سجلات وصول للمتابعة.' }, points: [{ en: 'Assign roles to staff accounts', ar: 'تعيين الأدوار لحسابات الموظفين' }, { en: 'Configure permissions by capability', ar: 'ضبط الصلاحيات حسب القدرات' }, { en: 'Review sign-in history and audit trail', ar: 'مراجعة سجل الدخول وسجل التدقيق' }] },
];

const studentFeatures = [
  { icon: BookOpen, en: 'Courses & learning materials', ar: 'المقررات والمواد التعليمية' },
  { icon: ClipboardCheck, en: 'Assignments, quizzes & results', ar: 'الواجبات والاختبارات والنتائج' },
  { icon: CalendarDays, en: 'Timetable, attendance & live classes', ar: 'الجدول والحضور والفصول المباشرة' },
  { icon: LibraryBig, en: 'Library & documents', ar: 'المكتبة والمستندات' },
  { icon: CreditCard, en: 'Payments & receipts', ar: 'المدفوعات والإيصالات' },
  { icon: MessageSquareText, en: 'Notifications & profile', ar: 'الإشعارات والملف الشخصي' },
];

export default async function HomePage({ params }: LocaleParams) {
  const locale = await initPage(params);
  const ar = locale === 'ar';
  const heritage = await api.heritage().catch(() => ({ media: [] }));
  const facade = heritageImage(heritage.media, 'al-ahmadiya-school-front-2018-amin-alwan.jpg');
  const c = (x: Copy) => ar ? x.ar : x.en;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'Al Ahmadiya School', alternateName: 'المدرسة الأحمدية', foundingDate: '1912', url: `${SITE_URL}/${locale}`, address: { '@type': 'PostalAddress', addressLocality: 'Al Ras, Deira, Dubai', addressCountry: 'AE' } }} />

      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 75% 20%, #c7a66a 0, transparent 34%), radial-gradient(circle at 10% 90%, #246466 0, transparent 38%)' }} />
        <div className="container-site grid min-h-[650px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[.18em] text-gold-300"><Globe2 className="size-4" />{ar ? 'منصة مؤسسية متكاملة' : 'Integrated institution platform'}</p>
            <h1 className="mt-7 max-w-3xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl xl:text-7xl">{ar ? 'كل عمليات المؤسسة، في مساحة عمل واحدة.' : 'One connected workspace for every part of the institution.'}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{ar ? 'من القبول والشؤون الأكاديمية إلى المالية والموارد البشرية والمكتبة وإدارة المحتوى؛ منصة الأحمدية تربط الفرق والطلاب من خلال صلاحيات واضحة ومسارات عمل منظمة.' : 'From admissions and academics to finance, HR, library and content operations, Al Ahmadiya brings teams and students together through clear permissions and organised workflows.'}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/login?audience=student" className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-brand-950 transition hover:bg-gold-300">{ar ? 'دخول الطلاب' : 'Student login'} <ArrowRight className="size-4" /></Link>
              <a href="/admin/login" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition hover:border-gold-300 hover:bg-white/10">{ar ? 'بوابة الموظفين' : 'Staff portal'} <LockKeyhole className="size-4" /></a>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[{ n: '14', en: 'Staff roles', ar: 'أدوار الموظفين' }, { n: '10', en: 'Core modules', ar: 'وحدات أساسية' }, { n: '2', en: 'Languages', ar: 'لغتان' }].map((x) => <div key={x.en}><p className="font-display text-4xl font-semibold text-gold-300">{x.n}</p><p className="mt-1 text-xs text-white/60">{ar ? x.ar : x.en}</p></div>)}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] border border-gold-300/25" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3"><div><p className="text-[10px] uppercase tracking-[.2em] text-gold-300">AL AHMADIYA</p><p className="mt-1 text-sm font-semibold">{ar ? 'لوحة العمليات المؤسسية' : 'Institution operations'}</p></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold text-emerald-200">{ar ? 'وصول قائم على الدور' : 'Role-based access'}</span></div>
              <div className="grid grid-cols-2 gap-3 p-3">
                {[{ icon: GraduationCap, en: 'Admissions', ar: 'القبول', n: '01' }, { icon: BookOpen, en: 'Academics', ar: 'الأكاديميات', n: '02' }, { icon: Wallet, en: 'Finance', ar: 'المالية', n: '03' }, { icon: BriefcaseBusiness, en: 'HR & staff', ar: 'الموارد البشرية', n: '04' }, { icon: LibraryBig, en: 'Library', ar: 'المكتبة', n: '05' }, { icon: ShieldCheck, en: 'Governance', ar: 'الحوكمة', n: '06' }].map((x) => <div key={x.en} className="rounded-2xl border border-white/10 bg-brand-900/80 p-4"><div className="flex items-center justify-between"><x.icon className="size-5 text-gold-300" /><span className="text-[10px] text-white/35">{x.n}</span></div><p className="mt-6 text-sm font-semibold">{ar ? x.ar : x.en}</p><div className="mt-3 h-1 rounded-full bg-white/10"><div className="h-1 w-2/3 rounded-full bg-gold-400" /></div></div>)}
              </div>
              {facade && <figure className="relative mt-1 h-44 overflow-hidden rounded-xl"><Image src={facade.path} alt={ar ? facade.altAr : facade.altEn} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover opacity-85" /><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-8 text-[10px] text-white/80">{ar ? facade.captionAr : facade.captionEn}</figcaption></figure>}
            </div>
          </div>
        </div>
      </section>

      <section className="container-site py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{ar ? 'منصة واحدة، فرق متعددة' : 'One platform · Connected teams'}</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{ar ? 'ما الذي يمكن للمنصة إدارته؟' : 'A complete view of institutional operations.'}</h2>
          <p className="mt-4 leading-7 text-muted">{ar ? 'كل وحدة مصممة لدعم سير عمل واضح، مع إظهار البيانات والإجراءات بحسب صلاحية المستخدم.' : 'Each module supports a defined workflow, with information and actions shown according to the signed-in user’s permissions.'}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((m, i) => <article key={m.title.en} className="group rounded-[1.6rem] border border-line bg-white p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-gold-400">
            <div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-800"><m.icon className="size-6" /></span><span className="font-display text-3xl text-gold-600/70">{String(i + 1).padStart(2, '0')}</span></div>
            <h3 className="mt-5 font-display text-2xl font-semibold text-brand-900">{c(m.title)}</h3>
            <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-muted">{c(m.body)}</p>
            <ul className="mt-5 space-y-2 border-t border-line pt-4">{m.points.map((p) => <li key={p.en} className="flex items-start gap-2 text-xs leading-5 text-ink/80"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-600" />{c(p)}</li>)}</ul>
            {m.href && <Link href={m.href} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-brand-800 hover:text-gold-700">{ar ? 'استكشف' : 'Explore'} <ArrowRight className="size-3.5" /></Link>}
          </article>)}
        </div>
      </section>

      <section className="bg-cream-200/60 py-20 sm:py-24">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{ar ? 'مساحات عمل مخصصة' : 'Dedicated staff workspaces'}</p><h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{ar ? 'كل دور يرى ما يحتاجه فقط.' : 'The right workspace for every role.'}</h2><p className="mt-4 leading-7 text-muted">{ar ? 'يتم تحديد صفحات العمل حسب الدور والصلاحيات الممنوحة للحساب. اختر دورك لفتح صفحة دخول الموظفين.' : 'Workspace navigation and available actions are determined by the role and permissions assigned to each account. Choose a role to open staff sign-in.'}</p></div>
            <a href="/admin/login" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800">{ar ? 'دخول الموظفين' : 'Staff sign in'} <ArrowRight className="size-4" /></a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roles.map((r) => <article key={r.key} className="flex min-h-48 flex-col rounded-2xl border border-white bg-white p-5 shadow-sm transition hover:border-gold-400 hover:shadow-md">
              <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800"><r.icon className="size-5" /></span><h3 className="font-semibold text-brand-900">{r.title}</h3></div>
              <p className="mt-3 flex-1 text-xs leading-6 text-muted">{c(r.body)}</p>
              <a href={`/admin/login?role=${r.key}`} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-800 hover:text-gold-700">{ar ? 'دخول هذا الدور' : 'Sign in with this role'} <ArrowRight className="size-3.5" /></a>
            </article>)}
          </div>
        </div>
      </section>

      <section className="container-site py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-700">{ar ? 'الطلاب والمتقدمون' : 'Student & applicant experience'}</p><h2 className="mt-3 font-display text-4xl font-semibold text-brand-900 sm:text-5xl">{ar ? 'التعلم والخدمات في متناول اليد.' : 'Learning and student services, connected.'}</h2><p className="mt-4 leading-7 text-muted">{ar ? 'توفر بوابة الطالب نقطة وصول موحدة للمقررات والخدمات الأكاديمية والمالية والإشعارات.' : 'The student portal brings learning, academic services, payments and updates into one place.'}</p><Link href="/login?audience=student" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-800">{ar ? 'افتح بوابة الطالب' : 'Open student portal'} <ArrowRight className="size-4" /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {studentFeatures.map((f) => <div key={f.en} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5"><span className="grid size-11 place-items-center rounded-xl bg-cream-200 text-brand-800"><f.icon className="size-5" /></span><p className="text-sm font-semibold text-brand-900">{ar ? f.ar : f.en}</p></div>)}
          </div>
        </div>
      </section>

      <section className="container-site pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-900 px-7 py-12 text-white sm:px-12 sm:py-16">
          <div aria-hidden className="absolute -end-16 -top-28 size-80 rounded-full border border-gold-300/20" /><div aria-hidden className="absolute -end-4 -top-16 size-56 rounded-full border border-gold-300/20" />
          <div className="relative max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-gold-300">{ar ? 'حوكمة واضحة. عمل أكثر كفاءة.' : 'Clear governance. Better coordinated work.'}</p><h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{ar ? 'صلاحيات دقيقة، ومسؤوليات واضحة.' : 'Built around clear roles and controls.'}</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">{ar ? 'تُفصل صلاحيات عرض البيانات وتحريرها واعتمادها. يمكن للمسؤولين المخولين إدارة حسابات الموظفين والأدوار ومراجعة سجلات الدخول والأنشطة.' : 'View, edit, approve and publish permissions are separated. Authorised administrators can manage staff accounts and role permissions, then review sign-in history and the audit trail.'}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[{ icon: LockKeyhole, en: 'Permission-based access', ar: 'وصول حسب الصلاحية' }, { icon: Settings2, en: 'Role configuration', ar: 'إعداد الأدوار' }, { icon: ShieldCheck, en: 'Security & audit records', ar: 'سجلات الأمان والتدقيق' }].map((x) => <div key={x.en} className="rounded-2xl border border-white/15 bg-white/5 p-4"><x.icon className="size-6 text-gold-300" /><p className="mt-3 text-sm font-semibold">{ar ? x.ar : x.en}</p></div>)}
            </div>
            <a href="/admin/login" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-brand-950 hover:bg-gold-300">{ar ? 'بوابة الموظفين' : 'Enter staff portal'} <ArrowRight className="size-4" /></a>
          </div>
        </div>
      </section>
    </>
  );
}
