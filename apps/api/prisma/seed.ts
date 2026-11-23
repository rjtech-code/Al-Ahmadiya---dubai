/**
 * Base seed: safe to run in every environment.
 *  - Permission catalogue, system roles, initial Super Admin (from env)
 *  - Site settings (university-specific values marked CLIENT_CONFIRMATION_REQUIRED)
 *  - Verified heritage timeline (sources: RESEARCH/FACT_VERIFICATION.md)
 *  - Licensed heritage media (Wikimedia Commons, CC BY-SA)
 *
 * It contains NO fabricated programmes, faculty, news or statistics.
 * Layout-sample content lives in prisma/seed-demo.ts (dev only, flagged isDemo).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/auth/password';
import { PERMISSIONS_CATALOGUE, ROLE_DEFINITIONS } from '../src/common/permissions';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const SRC = {
  dubaiCulture: 'https://dubaiculture.gov.ae/ar/attractions/heritage-sites/al-ahmadiya-school',
  culturalMap: 'https://culturalmap.gov.ae/en/facilities/al-ahmadiya-school',
  wikiEn: 'https://en.wikipedia.org/wiki/Al_Ahmadiya_School',
  gulfNews: 'https://gulfnews.com/uae/education/a-fountain-of-learning-1.1122832',
  khaleej: 'https://www.khaleejtimes.com/uae/dubais-first-school-turns-100',
  national: 'https://thenationalnews.com/uae/education/sheikh-mohammed-attends-moving-celebration-of-dubai-s-oldest-school-1.438788',
  insight: 'https://www.insightguides.com/destinations/africa-middle-east/united-arab-emirates/dubai/city-areas/deira/al-ahmadiya-school',
  emaratAlYoum: 'https://www.emaratalyoum.com/life/four-sides/2012-09-05-1.509225',
  cbuae: 'https://centralbank.ae/en/our-operations/currency-and-coins/commemorative-coins/silver-coins/al-ahmadiya-school/',
};

type Setting = { key: string; en: string | null; ar: string | null; confirmed: boolean; sourceUrl?: string; note?: string };

const SETTINGS: Setting[] = [
  // Historic identity — client-confirmed relationship, publicly verified facts
  { key: 'institution.name', en: 'Al Ahmadiya School', ar: 'المدرسة الأحمدية', confirmed: true, sourceUrl: SRC.dubaiCulture, note: 'Client confirmed (2026-11-22) that the project institution is the 1912 Al Ahmadiya School.' },
  { key: 'institution.founded', en: '1912', ar: '1912', confirmed: true, sourceUrl: SRC.wikiEn, note: 'Date inscribed over the main gate; one former student argues c.1905.' },
  { key: 'institution.founder', en: 'Sheikh Ahmed bin Dalmouk', ar: 'الشيخ أحمد بن دلموك', confirmed: true, sourceUrl: SRC.gulfNews },
  { key: 'institution.historicLocation', en: 'Al Ras, Deira, Dubai', ar: 'الراس، ديرة، دبي', confirmed: true, sourceUrl: SRC.culturalMap },
  { key: 'institution.historicBuildingStatus', en: 'The historic building is today a heritage museum managed by Dubai Culture & Arts Authority, currently closed for rehabilitation.', ar: 'المبنى التاريخي اليوم متحف تراثي تديره هيئة الثقافة والفنون في دبي، وهو مغلق حالياً لأعمال إعادة التأهيل.', confirmed: true, sourceUrl: SRC.culturalMap },

  // Proposed university — everything requires client confirmation
  { key: 'university.name', en: 'Al Ahmadiya University', ar: 'جامعة الأحمدية', confirmed: false, note: 'Working name taken from the RFP. Official English/Arabic name required.' },
  { key: 'university.status', en: 'Proposed — subject to regulatory approval', ar: 'مقترحة — رهناً بالموافقات التنظيمية', confirmed: false, note: 'Licensing status (MOHESR/CAA) not documented.' },
  { key: 'university.vision', en: null, ar: null, confirmed: false },
  { key: 'university.mission', en: null, ar: null, confirmed: false },
  { key: 'university.values', en: null, ar: null, confirmed: false },
  { key: 'university.leadershipMessage', en: null, ar: null, confirmed: false },
  { key: 'university.campusAddress', en: null, ar: null, confirmed: false, note: 'Future campus location. The heritage building is NOT the campus.' },
  { key: 'university.accreditation', en: null, ar: null, confirmed: false },
  { key: 'university.tourUrl', en: null, ar: null, confirmed: false, note: '360° virtual tour provider and URL.' },

  // Admissions — closed until confirmed
  { key: 'admissions.status', en: 'CLOSED', ar: 'CLOSED', confirmed: false, note: 'Set to OPEN and CONFIRMED only after approval to recruit students.' },
  { key: 'admissions.intake', en: null, ar: null, confirmed: false },
  { key: 'admissions.applicationDeadline', en: null, ar: null, confirmed: false },
  { key: 'admissions.applicationFeeAed', en: null, ar: null, confirmed: false },

  // Contact — required from client
  { key: 'contact.email', en: null, ar: null, confirmed: false },
  { key: 'contact.phone', en: null, ar: null, confirmed: false },
  { key: 'contact.address', en: null, ar: null, confirmed: false },
  { key: 'contact.mapUrl', en: null, ar: null, confirmed: false },
  { key: 'social.instagram', en: null, ar: null, confirmed: false },
  { key: 'social.x', en: null, ar: null, confirmed: false },
  { key: 'social.linkedin', en: null, ar: null, confirmed: false },
  { key: 'social.youtube', en: null, ar: null, confirmed: false },
];

const MILESTONES = [
  {
    yearLabel: '1912',
    titleEn: 'A school founded by a pearl merchant',
    titleAr: 'مدرسة أسسها تاجر لؤلؤ',
    bodyEn:
      'Sheikh Ahmed bin Dalmouk, a leading pearl merchant, began building a school in Al Ras, Deira. He died before it was finished; his son, Sheikh Mohammed bin Ahmed bin Dalmouk, completed it and named it Al Ahmadiya in his father’s memory. It is regarded as Dubai’s first semi-formal school.',
    bodyAr:
      'شرع الشيخ أحمد بن دلموك، أحد كبار تجار اللؤلؤ، في بناء مدرسة في منطقة الراس بديرة، غير أنه توفي قبل اكتمالها، فأتمّها ابنه الشيخ محمد بن أحمد بن دلموك وأطلق عليها اسم "الأحمدية" تخليداً لذكرى والده. وتُعدّ أول مدرسة شبه نظامية في دبي.',
    sourceUrls: [SRC.dubaiCulture, SRC.wikiEn, SRC.gulfNews],
    caveatEn: '1912 is the date inscribed over the main gate. Emirati author and former pupil Abdul Ghaffar Hussain has argued the school was built around 1905.',
    caveatAr: 'عام 1912 هو التاريخ المنقوش على البوابة الرئيسية، فيما يرى الكاتب الإماراتي عبد الغفار حسين، وهو من طلبة المدرسة السابقين، أنها بُنيت نحو عام 1905.',
  },
  {
    yearLabel: '1912–1922',
    titleEn: 'Built in phases around a courtyard',
    titleAr: 'بناء على مراحل حول فناء',
    bodyEn:
      'The two-storey building was completed in phases over the following decade, arranged around an open courtyard with classrooms on both levels and decorated arches facing the yard.',
    bodyAr: 'اكتمل المبنى ذو الطابقين على مراحل خلال العقد التالي، وتتوزع فصوله الدراسية على الطابقين حول فناء مفتوح تطلّ عليه أقواس مزخرفة.',
    sourceUrls: [SRC.gulfNews],
  },
  {
    yearLabel: 'Early years',
    titleEn: 'Qur’an, Arabic and arithmetic',
    titleAr: 'القرآن الكريم واللغة العربية والحساب',
    bodyEn:
      'Teaching began with the Qur’an, Arabic language, religious studies and arithmetic, delivered by teachers recruited from the wider region. The curriculum later broadened to include literature, sciences, history and geography.',
    bodyAr: 'بدأ التعليم فيها بالقرآن الكريم واللغة العربية والعلوم الشرعية والحساب على أيدي معلمين استُقدموا من المنطقة، ثم اتسع المنهج لاحقاً ليشمل الأدب والعلوم والتاريخ والجغرافيا.',
    sourceUrls: [SRC.dubaiCulture, SRC.insight],
  },
  {
    yearLabel: '1956',
    titleEn: 'Among Dubai’s first regular schools',
    titleAr: 'من أوائل المدارس النظامية في دبي',
    bodyEn: 'When formal education was introduced in Dubai, Al Ahmadiya became one of the emirate’s first regular schools.',
    bodyAr: 'مع إدخال التعليم النظامي في دبي، أصبحت الأحمدية من أوائل المدارس النظامية في الإمارة.',
    sourceUrls: [SRC.insight],
    caveatEn: 'Sources give 1955–1956 for the introduction of formal education.',
    caveatAr: 'تذكر المصادر عامي 1955 و1956 لبدء التعليم النظامي.',
  },
  {
    yearLabel: '1957',
    titleEn: 'A student festival with Sheikh Rashid',
    titleAr: 'احتفال طلابي بحضور الشيخ راشد',
    bodyEn: 'The late Sheikh Rashid bin Saeed Al Maktoum attended a student festival at the school, recorded in a 1957 photograph from the Emirates News Agency (WAM) archive.',
    bodyAr: 'حضر المغفور له الشيخ راشد بن سعيد آل مكتوم احتفالاً طلابياً في المدرسة، توثّقه صورة من أرشيف وكالة أنباء الإمارات (وام) تعود إلى عام 1957.',
    sourceUrls: [SRC.national],
  },
  {
    yearLabel: '1962–1963',
    titleEn: 'Moving to a larger home',
    titleAr: 'الانتقال إلى مبنى أوسع',
    bodyEn: 'After educating more than 3,500 pupils, the school outgrew its building and its students moved to a new, larger Al Ahmadiya school nearby.',
    bodyAr: 'بعد أن تخرّج فيها أكثر من 3,500 طالب، ضاق المبنى بطلابه فانتقلوا إلى مدرسة أحمدية جديدة أوسع في مكان قريب.',
    sourceUrls: [SRC.gulfNews, SRC.wikiEn],
    caveatEn: 'Sources differ on whether the move took place in 1962 or 1963.',
    caveatAr: 'تختلف المصادر حول ما إذا كان الانتقال عام 1962 أم 1963.',
  },
  {
    yearLabel: '1994–2000',
    titleEn: 'Restored as a museum of education',
    titleAr: 'ترميمها متحفاً للتعليم',
    bodyEn: 'The Government of Dubai restored the building from 1994. It opened as a museum on 20 March 2000, telling the story of education in Dubai. It is today managed by Dubai Culture & Arts Authority.',
    bodyAr: 'رمّمت حكومة دبي المبنى ابتداءً من عام 1994، وافتُتح متحفاً في 20 مارس 2000 يروي قصة التعليم في دبي، وتتولى هيئة الثقافة والفنون في دبي إدارته اليوم.',
    sourceUrls: [SRC.wikiEn, SRC.culturalMap, SRC.dubaiCulture],
  },
  {
    yearLabel: '2012',
    titleEn: 'One hundred years',
    titleAr: 'مئة عام',
    bodyEn: 'The school’s centenary was celebrated in 2012 in the presence of His Highness Sheikh Mohammed bin Rashid Al Maktoum. Its legacy has also been commemorated on a Central Bank of the UAE silver coin.',
    bodyAr: 'احتُفل بمئوية المدرسة عام 2012 بحضور صاحب السمو الشيخ محمد بن راشد آل مكتوم، كما خُلّد إرثها على عملة فضية تذكارية أصدرها مصرف الإمارات العربية المتحدة المركزي.',
    sourceUrls: [SRC.khaleej, SRC.national, SRC.emaratAlYoum, SRC.cbuae],
  },
  {
    yearLabel: 'Next chapter',
    titleEn: 'Towards a university',
    titleAr: 'نحو جامعة',
    bodyEn: 'Al Ahmadiya is preparing its next chapter as a proposed university. Details of approvals, programmes and campus will be published here once officially confirmed.',
    bodyAr: 'تستعد الأحمدية لفصلها التالي بوصفها جامعة مقترحة، وستُنشر هنا تفاصيل الموافقات والبرامج والحرم الجامعي فور تأكيدها رسمياً.',
    sourceUrls: [],
    confirmation: 'CLIENT_CONFIRMATION_REQUIRED' as const,
  },
];

const MEDIA = [
  {
    path: '/images/history/al-ahmadiya-school-2013-culturearts.jpg', width: 1920, height: 1280,
    altEn: 'The inner courtyard of the historic Al Ahmadiya School, with carved scalloped arches on the ground floor and a wooden-beamed gallery above',
    altAr: 'الفناء الداخلي للمدرسة الأحمدية التاريخية، بأقواسه المزخرفة في الطابق الأرضي وممرّه العلوي ذي السقف الخشبي',
    captionEn: 'The courtyard of the 1912 Al Ahmadiya School building in Al Ras, now a Dubai Culture heritage museum.',
    captionAr: 'فناء مبنى المدرسة الأحمدية (1912) في الراس، وهو اليوم متحف تراثي تابع لهيئة دبي للثقافة.',
    author: 'CultureArts', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Al_Ahmadiya_School.JPG',
  },
  {
    path: '/images/history/al-ahmadiya-school-front-2018-amin-alwan.jpg', width: 1920, height: 1298,
    altEn: 'Front façade of the historic Al Ahmadiya School: a two-storey building with arched openings, carved window grilles and a scalloped entrance',
    altAr: 'الواجهة الأمامية للمدرسة الأحمدية التاريخية: مبنى من طابقين بفتحات مقوّسة ونوافذ مزخرفة ومدخل مقوّس',
    captionEn: 'The historic Al Ahmadiya School building, Al Ras, Deira (2018).',
    captionAr: 'مبنى المدرسة الأحمدية التاريخي، الراس، ديرة (2018).',
    author: 'Amin Alwan (أمين علوان)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Al_Ahmadiya_School_in_Dubai_-_building_front_side.jpg',
  },
  {
    path: '/images/history/al-ahmadiya-school-street-2018-amin-alwan.jpg', width: 1920, height: 1275,
    altEn: 'The historic Al Ahmadiya School seen across the square in Al Ras, with neighbouring heritage buildings and a wind tower',
    altAr: 'المدرسة الأحمدية التاريخية من الساحة المقابلة في الراس، وتظهر المباني التراثية المجاورة وبرج رياح',
    captionEn: 'Al Ahmadiya School and its surroundings in the Al Ras heritage district (2018).',
    captionAr: 'المدرسة الأحمدية ومحيطها في حي الراس التراثي (2018).',
    author: 'Amin Alwan (أمين علوان)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Al_Ahmadiya_School_in_Dubai_-_building_front_side_with_the_area_around_the_building.jpg',
  },
  {
    path: '/images/history/al-ahmadiya-school-al-ras-2018-omar-kamel.jpg', width: 1920, height: 1440,
    altEn: 'Side view of the historic Al Ahmadiya School along a paved lane, showing its coral-stone base and decorative window grilles',
    altAr: 'منظر جانبي للمدرسة الأحمدية التاريخية على ممرّ مرصوف، تظهر فيه قاعدتها من الحجر المرجاني ونوافذها المزخرفة',
    captionEn: 'The coral-stone base and carved grilles of the Al Ahmadiya School (2018).',
    captionAr: 'القاعدة المبنية من الحجر المرجاني والنوافذ المزخرفة في المدرسة الأحمدية (2018).',
    author: 'Omar Kamel', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Al_Ahmadiya_School_in_Al_Ras,_Dubai.jpg',
  },
];

async function main() {
  // Permissions & roles
  const before = new Set((await prisma.permission.findMany({ select: { key: true } })).map((p) => p.key));
  for (const [key, description] of Object.entries(PERMISSIONS_CATALOGUE)) {
    await prisma.permission.upsert({ where: { key }, create: { key, description }, update: { description } });
  }
  const perms = await prisma.permission.findMany();
  const permId = new Map(perms.map((p) => [p.key, p.id]));
  for (const r of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      create: { key: r.key, nameEn: r.nameEn, nameAr: r.nameAr, isSystem: true },
      update: { nameEn: r.nameEn, nameAr: r.nameAr, isSystem: true },
    });
    // Only seed permissions for roles that have none yet, so admin edits are preserved (except SUPER_ADMIN which always has all).
    const existing = await prisma.rolePermission.count({ where: { roleId: role.id } });
    if (existing === 0 || r.key === 'SUPER_ADMIN') {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({ data: r.permissions.map((k) => ({ roleId: role.id, permissionId: permId.get(k)! })) });
    } else {
      // Permissions introduced by this release are granted to roles that define them; admin edits to older ones are preserved.
      const added = r.permissions.filter((k) => !before.has(k));
      if (added.length) await prisma.rolePermission.createMany({ data: added.map((k) => ({ roleId: role.id, permissionId: permId.get(k)! })), skipDuplicates: true });
    }
  }

  // Initial Super Admin
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password && process.env.NODE_ENV === 'production') {
    const weak = password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || /changeme|set-a-strong|password/i.test(password);
    if (weak || /localhost|example|\.test$/.test(email)) throw new Error('Production seed refused: use a real admin email and a strong SEED_ADMIN_PASSWORD (14+ chars, upper, lower, digit).');
  }
  if (email && password) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (!exists) {
      const superAdmin = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' } });
      await prisma.user.create({
        data: { email, fullName: 'System Administrator', passwordHash: await hashPassword(password), emailVerified: true, roles: { create: { roleId: superAdmin.id } } },
      });
      console.log(`Created Super Admin ${email}`);
    }
  } else {
    console.warn('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin user created.');
  }

  // Settings: create if missing; never overwrite values an administrator has edited.
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, valueEn: s.en, valueAr: s.ar, confirmation: s.confirmed ? 'CONFIRMED' : 'CLIENT_CONFIRMATION_REQUIRED', sourceUrl: s.sourceUrl, note: s.note },
      update: {},
    });
  }

  // Heritage timeline: replaced wholesale only if not yet edited (seed is the source of truth until the CMS takes over).
  if ((await prisma.heritageMilestone.count()) === 0) {
    await prisma.heritageMilestone.createMany({
      data: MILESTONES.map((m, i) => ({ ...m, sortOrder: (i + 1) * 10, confirmation: m.confirmation ?? 'CONFIRMED' })),
    });
  }

  for (const m of MEDIA) {
    await prisma.mediaAsset.upsert({ where: { path: m.path }, create: { ...m, approved: false }, update: {} });
  }

  console.log('Base seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
