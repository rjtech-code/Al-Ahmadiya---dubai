/**
 * Academic content: colleges, departments, faculty, programmes, courses, news, events,
 * publications, FAQs and campus tour stops, with images from apps/web/public/images.
 *
 *   npm run db:seed:content -w apps/api
 *
 *  - Idempotent: records are matched by slug / course code and updated in place.
 *  - Records created by the earlier preview seed (slugs "demo-…", codes "DEMO-…") are
 *    migrated to their clean slug, keeping lessons, enrolments and live classes attached.
 *  - Site settings and the verified heritage timeline are never modified.
 *  - Re-running resets these records' text, images and prices to the values below, so
 *    once staff start editing in the admin panel, edit there instead of re-running.
 *
 * Image licences: RESEARCH/IMAGE_ASSET_REGISTER.md.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const LIVE = { publishStatus: 'PUBLISHED' as const, isDemo: false, deletedAt: null };
const OK = { ...LIVE, confirmation: 'CONFIRMED' as const };
/** For models without soft delete (FAQs, tour stops). */
const SHOWN = { publishStatus: 'PUBLISHED' as const, isDemo: false, confirmation: 'CONFIRMED' as const };

/** Find by the clean key, else by the legacy preview key; create when neither exists. */
async function upsert<T extends { id: string }>(
  find: () => Promise<{ id: string } | null>,
  findLegacy: () => Promise<{ id: string } | null>,
  create: () => Promise<T>,
  update: (id: string) => Promise<T>,
): Promise<T> {
  const existing = (await find()) ?? (await findLegacy());
  return existing ? update(existing.id) : create();
}

const days = (n: number, h = 9) => {
  const d = new Date();
  d.setUTCHours(h - 4, 0, 0, 0); // Dubai local hour
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};
const img = (p: string) => `/images/${p}.jpg`;

// ───────────────────────── Faculty ─────────────────────────

const FACULTY = [
  { slug: 'layla-haddad', en: 'Dr. Layla Haddad', ar: 'د. ليلى حداد', titleEn: 'Associate Professor', titleAr: 'أستاذ مشارك', specEn: 'Business Analytics', specAr: 'تحليلات الأعمال', dept: 'business-administration' },
  { slug: 'omar-farouk', en: 'Prof. Omar Farouk', ar: 'أ. د. عمر فاروق', titleEn: 'Professor', titleAr: 'أستاذ', specEn: 'Strategic Management', specAr: 'الإدارة الاستراتيجية', dept: 'business-administration' },
  { slug: 'noura-saeed', en: 'Dr. Noura Saeed', ar: 'د. نورة سعيد', titleEn: 'Assistant Professor', titleAr: 'أستاذ مساعد', specEn: 'Accounting & Finance', specAr: 'المحاسبة والتمويل', dept: 'accounting-finance' },
  { slug: 'karim-nasser', en: 'Dr. Karim Nasser', ar: 'د. كريم ناصر', titleEn: 'Associate Professor', titleAr: 'أستاذ مشارك', specEn: 'Data Science', specAr: 'علم البيانات', dept: 'computer-science' },
  { slug: 'maryam-khalil', en: 'Dr. Maryam Khalil', ar: 'د. مريم خليل', titleEn: 'Professor', titleAr: 'أستاذ', specEn: 'Software Engineering', specAr: 'هندسة البرمجيات', dept: 'computer-science' },
  { slug: 'yousef-rahman', en: 'Dr. Yousef Rahman', ar: 'د. يوسف رحمن', titleEn: 'Assistant Professor', titleAr: 'أستاذ مساعد', specEn: 'Arabic Literature', specAr: 'الأدب العربي', dept: 'arabic-language' },
  { slug: 'huda-salem', en: 'Dr. Huda Salem', ar: 'د. هدى سالم', titleEn: 'Associate Professor', titleAr: 'أستاذ مشارك', specEn: 'Educational Leadership', specAr: 'القيادة التربوية', dept: 'education' },
];

// ───────────────────────── Colleges & departments ─────────────────────────

const COLLEGES = [
  {
    slug: 'college-of-business', en: 'College of Business', ar: 'كلية الأعمال', dean: 'omar-farouk', imagePath: img('colleges/business'),
    summaryEn: 'Management, analytics, accounting and finance for a fast-moving regional economy.',
    summaryAr: 'الإدارة والتحليلات والمحاسبة والتمويل لاقتصاد إقليمي سريع النمو.',
    overviewEn: 'The College of Business prepares graduates to lead organisations in Dubai and the wider region. Teaching combines sound theory with case studies drawn from local family businesses, government entities and international firms, and every programme includes applied projects with industry partners.',
    overviewAr: 'تُعدّ كلية الأعمال خريجين قادرين على قيادة المؤسسات في دبي والمنطقة. ويجمع التدريس بين الأسس النظرية ودراسات الحالة المستمدة من الشركات العائلية المحلية والجهات الحكومية والشركات الدولية، ويتضمن كل برنامج مشاريع تطبيقية مع شركاء من القطاع.',
    visionEn: 'To be a trusted source of business leaders who combine global practice with regional insight.',
    visionAr: 'أن نكون مصدراً موثوقاً لقادة أعمال يجمعون بين الممارسة العالمية والفهم العميق للمنطقة.',
    missionEn: 'To educate ethical, analytical and entrepreneurial graduates through practice-led teaching and close links with employers.',
    missionAr: 'إعداد خريجين ملتزمين أخلاقياً ومتمكنين تحليلياً وروّاد أعمال، من خلال تعليم قائم على الممارسة وشراكات وثيقة مع جهات التوظيف.',
    departments: [
      { slug: 'business-administration', en: 'Business Administration', ar: 'إدارة الأعمال', head: 'layla-haddad', imagePath: img('departments/business-administration'),
        focusEn: 'management, strategy, marketing and business analytics', focusAr: 'الإدارة والاستراتيجية والتسويق وتحليلات الأعمال',
        areasEn: ['Family business governance', 'Digital transformation', 'Entrepreneurship', 'Business analytics'], areasAr: ['حوكمة الشركات العائلية', 'التحول الرقمي', 'ريادة الأعمال', 'تحليلات الأعمال'] },
      { slug: 'accounting-finance', en: 'Accounting & Finance', ar: 'المحاسبة والتمويل', head: 'noura-saeed', imagePath: img('departments/accounting-finance'),
        focusEn: 'financial reporting, auditing, corporate finance and Islamic finance', focusAr: 'التقارير المالية والتدقيق وتمويل الشركات والتمويل الإسلامي',
        areasEn: ['Financial reporting', 'Islamic finance', 'Audit and assurance', 'Corporate finance'], areasAr: ['التقارير المالية', 'التمويل الإسلامي', 'التدقيق والتأكيد', 'تمويل الشركات'] },
    ],
  },
  {
    slug: 'college-of-computing', en: 'College of Computing & Technology', ar: 'كلية الحوسبة والتقنية', dean: 'maryam-khalil', imagePath: img('colleges/computing'),
    summaryEn: 'Software, data and intelligent systems taught through hands-on projects.',
    summaryAr: 'البرمجيات والبيانات والأنظمة الذكية من خلال مشاريع تطبيقية.',
    overviewEn: 'The College of Computing & Technology brings together software engineering, data science and artificial intelligence. Students spend much of their time in labs and studios, building working systems in teams and presenting them to faculty and industry reviewers.',
    overviewAr: 'تجمع كلية الحوسبة والتقنية بين هندسة البرمجيات وعلم البيانات والذكاء الاصطناعي. ويقضي الطلبة جزءاً كبيراً من وقتهم في المختبرات، يبنون أنظمة عاملة ضمن فرق ويعرضونها على أعضاء هيئة التدريس ومراجعين من القطاع.',
    visionEn: 'To shape technologists who build responsible digital solutions for the region.',
    visionAr: 'إعداد تقنيين يبنون حلولاً رقمية مسؤولة تخدم المنطقة.',
    missionEn: 'To combine rigorous computing foundations with project-based learning and ethical practice.',
    missionAr: 'الجمع بين أسس حوسبة متينة والتعلم القائم على المشاريع والممارسة الأخلاقية.',
    departments: [
      { slug: 'computer-science', en: 'Computer Science', ar: 'علوم الحاسوب', head: 'karim-nasser', imagePath: img('departments/computer-science'),
        focusEn: 'programming, algorithms, data science and machine learning', focusAr: 'البرمجة والخوارزميات وعلم البيانات وتعلّم الآلة',
        areasEn: ['Machine learning', 'Arabic natural language processing', 'Software engineering', 'Learning analytics'], areasAr: ['تعلّم الآلة', 'معالجة اللغة العربية الطبيعية', 'هندسة البرمجيات', 'تحليلات التعلّم'] },
    ],
  },
  {
    slug: 'college-of-humanities', en: 'College of Humanities & Education', ar: 'كلية العلوم الإنسانية والتربية', dean: 'huda-salem', imagePath: img('colleges/humanities'),
    summaryEn: 'Arabic language, literature and teacher education, continuing a tradition that began in 1912.',
    summaryAr: 'اللغة العربية وآدابها وإعداد المعلمين، امتداداً لتقليد بدأ عام 1912.',
    overviewEn: 'The College of Humanities & Education carries forward the founding purpose of Al Ahmadiya: teaching Arabic and preparing those who teach. Its departments combine close reading of classical and modern texts with contemporary approaches to curriculum, assessment and classroom practice.',
    overviewAr: 'تواصل كلية العلوم الإنسانية والتربية الغاية التي تأسست من أجلها الأحمدية: تعليم العربية وإعداد من يعلّمها. وتجمع أقسامها بين القراءة المتأنية للنصوص الكلاسيكية والحديثة والمناهج المعاصرة في تصميم المقررات والتقييم والممارسة الصفية.',
    visionEn: 'To keep Arabic scholarship and good teaching at the heart of education in Dubai.',
    visionAr: 'أن تبقى الدراسات العربية والتعليم المتميز في صميم التعليم في دبي.',
    missionEn: 'To develop confident readers, writers and educators rooted in Arabic heritage and open to the world.',
    missionAr: 'إعداد قرّاء وكتّاب ومربين واثقين، متجذرين في التراث العربي ومنفتحين على العالم.',
    departments: [
      { slug: 'arabic-language', en: 'Arabic Language & Literature', ar: 'اللغة العربية وآدابها', head: 'yousef-rahman', imagePath: img('departments/arabic-language'),
        focusEn: 'classical and modern Arabic literature, linguistics and translation', focusAr: 'الأدب العربي الكلاسيكي والحديث واللسانيات والترجمة',
        areasEn: ['Classical Arabic prose', 'Gulf literary heritage', 'Arabic linguistics', 'Translation studies'], areasAr: ['النثر العربي الكلاسيكي', 'التراث الأدبي الخليجي', 'اللسانيات العربية', 'دراسات الترجمة'] },
      { slug: 'education', en: 'Education', ar: 'التربية', head: 'huda-salem', imagePath: img('departments/education'),
        focusEn: 'curriculum design, assessment and educational leadership', focusAr: 'تصميم المناهج والتقييم والقيادة التربوية',
        areasEn: ['Curriculum design', 'Assessment for learning', 'Educational leadership', 'Digital pedagogy'], areasAr: ['تصميم المناهج', 'التقييم من أجل التعلّم', 'القيادة التربوية', 'التربية الرقمية'] },
    ],
  },
];

// ───────────────────────── Courses ─────────────────────────

type CourseDef = {
  code: string; dept: string; en: string; ar: string; cr: number; instr: string; featured?: boolean; prereq?: string;
  price: number; live?: boolean; descEn: string; descAr: string; outEn: string[]; outAr: string[];
  modules: [string, string, string[], string[]][];
};
const COURSES: CourseDef[] = [
  { code: 'CS101', dept: 'computer-science', en: 'Introduction to Programming', ar: 'مقدمة في البرمجة', cr: 3, instr: 'maryam-khalil', featured: true, price: 450,
    descEn: 'Learn to think like a programmer. Starting from zero, you write real Python programs, work with data, and build a small project you can show to others.',
    descAr: 'تعلّم التفكير كمبرمج. تبدأ من الصفر وتكتب برامج حقيقية بلغة بايثون، وتتعامل مع البيانات، وتبني مشروعاً صغيراً يمكنك عرضه.',
    outEn: ['Write and debug Python programs', 'Use variables, loops, functions and lists confidently', 'Read and write data files', 'Break a problem into small, testable steps'],
    outAr: ['كتابة برامج بايثون وتصحيح أخطائها', 'استخدام المتغيرات والحلقات والدوال والقوائم بثقة', 'قراءة ملفات البيانات وكتابتها', 'تقسيم المشكلة إلى خطوات صغيرة قابلة للاختبار'],
    modules: [['Getting started', 'البداية', ['Setting up Python', 'Variables and types', 'Input and output'], ['تجهيز بايثون', 'المتغيرات والأنواع', 'الإدخال والإخراج']],
      ['Control flow', 'التحكم في التدفق', ['Conditions', 'Loops', 'Functions'], ['الشروط', 'الحلقات', 'الدوال']],
      ['Working with data', 'التعامل مع البيانات', ['Lists and dictionaries', 'Files', 'Mini project'], ['القوائم والقواميس', 'الملفات', 'مشروع مصغّر']]] },
  { code: 'CS201', dept: 'computer-science', en: 'Data Structures & Algorithms', ar: 'هياكل البيانات والخوارزميات', cr: 3, instr: 'maryam-khalil', prereq: 'CS101', price: 600,
    descEn: 'Choose the right structure for the job and reason about how fast your code really is. Covers arrays, linked lists, trees, graphs, sorting and searching.',
    descAr: 'اختر البنية المناسبة لكل مهمة وقدّر سرعة شيفرتك فعلياً. يغطي المصفوفات والقوائم المترابطة والأشجار والرسوم البيانية وخوارزميات الترتيب والبحث.',
    outEn: ['Analyse running time with Big-O notation', 'Implement lists, stacks, queues, trees and graphs', 'Apply classic sorting and searching algorithms', 'Pick an appropriate data structure for a given problem'],
    outAr: ['تحليل زمن التنفيذ باستخدام ترميز O الكبير', 'تنفيذ القوائم والمكدسات والطوابير والأشجار والرسوم البيانية', 'تطبيق خوارزميات الترتيب والبحث الكلاسيكية', 'اختيار بنية البيانات المناسبة لكل مشكلة'],
    modules: [['Foundations', 'الأسس', ['Complexity', 'Arrays and lists', 'Stacks and queues'], ['التعقيد', 'المصفوفات والقوائم', 'المكدسات والطوابير']],
      ['Trees and graphs', 'الأشجار والرسوم البيانية', ['Binary search trees', 'Heaps', 'Graph traversal'], ['أشجار البحث الثنائية', 'الأكوام', 'اجتياز الرسوم البيانية']],
      ['Algorithms', 'الخوارزميات', ['Sorting', 'Searching', 'Dynamic programming'], ['الترتيب', 'البحث', 'البرمجة الديناميكية']]] },
  { code: 'DS210', dept: 'computer-science', en: 'Foundations of Data Science', ar: 'أسس علم البيانات', cr: 3, instr: 'karim-nasser', featured: true, prereq: 'CS101', price: 750, live: true,
    descEn: 'A live, instructor-led course. Clean, explore and visualise real datasets, then tell a clear story with the results. Classes run online with recordings, notes and quizzes after each session.',
    descAr: 'مقرر مباشر بإشراف المحاضر. نظّف مجموعات بيانات حقيقية واستكشفها ومثّلها بصرياً، ثم اعرض النتائج بقصة واضحة. تُعقد الحصص عبر الإنترنت مع تسجيلات وملاحظات واختبارات قصيرة بعد كل حصة.',
    outEn: ['Load, clean and reshape tabular data', 'Summarise data with descriptive statistics', 'Build clear, honest charts', 'Communicate findings to non-specialists'],
    outAr: ['تحميل البيانات الجدولية وتنظيفها وإعادة تشكيلها', 'تلخيص البيانات بالإحصاء الوصفي', 'إنشاء رسوم بيانية واضحة وأمينة', 'عرض النتائج لغير المتخصصين'],
    modules: [['Data basics', 'أساسيات البيانات', ['Tabular data', 'Cleaning', 'Joining datasets'], ['البيانات الجدولية', 'التنظيف', 'دمج مجموعات البيانات']],
      ['Exploration', 'الاستكشاف', ['Descriptive statistics', 'Distributions', 'Correlation'], ['الإحصاء الوصفي', 'التوزيعات', 'الارتباط']],
      ['Visual storytelling', 'السرد البصري', ['Choosing a chart', 'Dashboards', 'Presenting results'], ['اختيار الرسم البياني', 'لوحات المعلومات', 'عرض النتائج']]] },
  { code: 'DS320', dept: 'computer-science', en: 'Machine Learning', ar: 'تعلّم الآلة', cr: 3, instr: 'karim-nasser', prereq: 'DS210', price: 900,
    descEn: 'Train models that learn from data. You build regression and classification models, evaluate them properly, and discuss when automated decisions are and are not appropriate.',
    descAr: 'درّب نماذج تتعلم من البيانات. تبني نماذج الانحدار والتصنيف وتقيّمها بالشكل الصحيح، وتناقش متى تكون القرارات الآلية مناسبة ومتى لا تكون.',
    outEn: ['Explain supervised and unsupervised learning', 'Train and tune regression and classification models', 'Evaluate models with appropriate metrics', 'Identify bias and risk in automated decisions'],
    outAr: ['شرح التعلم الموجّه وغير الموجّه', 'تدريب نماذج الانحدار والتصنيف وضبطها', 'تقييم النماذج بالمقاييس المناسبة', 'تحديد التحيز والمخاطر في القرارات الآلية'],
    modules: [['Learning from data', 'التعلم من البيانات', ['Regression', 'Classification', 'Overfitting'], ['الانحدار', 'التصنيف', 'الإفراط في الملاءمة']],
      ['Models', 'النماذج', ['Decision trees', 'Ensembles', 'Neural networks'], ['أشجار القرار', 'النماذج التجميعية', 'الشبكات العصبية']],
      ['Responsible ML', 'تعلّم الآلة المسؤول', ['Evaluation', 'Fairness', 'Deployment'], ['التقييم', 'العدالة', 'النشر']]] },
  { code: 'BA101', dept: 'business-administration', en: 'Principles of Management', ar: 'مبادئ الإدارة', cr: 3, instr: 'omar-farouk', featured: true, price: 400,
    descEn: 'How organisations plan, organise, lead and control. Through regional case studies you see how managers make decisions in family firms, start-ups and large enterprises.',
    descAr: 'كيف تخطط المؤسسات وتنظّم وتقود وتراقب. من خلال دراسات حالة إقليمية ترى كيف يتخذ المديرون قراراتهم في الشركات العائلية والناشئة والمؤسسات الكبيرة.',
    outEn: ['Describe the core functions of management', 'Analyse an organisation\'s structure and culture', 'Apply basic planning and decision tools', 'Reflect on ethical leadership'],
    outAr: ['وصف الوظائف الأساسية للإدارة', 'تحليل هيكل المؤسسة وثقافتها', 'تطبيق أدوات التخطيط واتخاذ القرار الأساسية', 'التأمل في القيادة الأخلاقية'],
    modules: [['Planning', 'التخطيط', ['Goals and strategy', 'Decision making', 'Environment analysis'], ['الأهداف والاستراتيجية', 'اتخاذ القرار', 'تحليل البيئة']],
      ['Organising and leading', 'التنظيم والقيادة', ['Structure', 'Motivation', 'Teams'], ['الهيكل', 'التحفيز', 'الفرق']],
      ['Control', 'الرقابة', ['Performance measures', 'Quality', 'Case study'], ['مقاييس الأداء', 'الجودة', 'دراسة حالة']]] },
  { code: 'BA220', dept: 'business-administration', en: 'Business Analytics', ar: 'تحليلات الأعمال', cr: 3, instr: 'layla-haddad', featured: true, prereq: 'BA101', price: 650,
    descEn: 'Turn business data into decisions. Using spreadsheets and visual tools, you analyse sales, customers and operations, and present recommendations managers can act on.',
    descAr: 'حوّل بيانات الأعمال إلى قرارات. باستخدام جداول البيانات وأدوات التصوير البصري تحلل المبيعات والعملاء والعمليات، وتقدّم توصيات قابلة للتنفيذ.',
    outEn: ['Frame business questions as analysis tasks', 'Build pivot tables, forecasts and dashboards', 'Interpret key performance indicators', 'Present data-driven recommendations'],
    outAr: ['صياغة أسئلة الأعمال كمهام تحليلية', 'بناء الجداول المحورية والتوقعات ولوحات المعلومات', 'تفسير مؤشرات الأداء الرئيسية', 'تقديم توصيات مبنية على البيانات'],
    modules: [['Descriptive analytics', 'التحليلات الوصفية', ['KPIs', 'Pivot tables', 'Dashboards'], ['مؤشرات الأداء', 'الجداول المحورية', 'لوحات المعلومات']],
      ['Predictive analytics', 'التحليلات التنبؤية', ['Trends', 'Forecasting', 'Regression'], ['الاتجاهات', 'التنبؤ', 'الانحدار']],
      ['Decisions', 'القرارات', ['Scenario analysis', 'Storytelling', 'Capstone'], ['تحليل السيناريوهات', 'السرد بالبيانات', 'مشروع ختامي']]] },
  { code: 'AF110', dept: 'accounting-finance', en: 'Financial Accounting', ar: 'المحاسبة المالية', cr: 3, instr: 'noura-saeed', price: 500,
    descEn: 'Read and prepare the statements every business relies on. Record transactions, build a balance sheet and income statement, and interpret what they reveal.',
    descAr: 'اقرأ القوائم التي تعتمد عليها كل منشأة وأعدّها. سجّل المعاملات، وأعدّ الميزانية العمومية وقائمة الدخل، وفسّر ما تكشفه.',
    outEn: ['Apply double-entry bookkeeping', 'Prepare the main financial statements', 'Explain key accounting principles', 'Calculate and interpret basic ratios'],
    outAr: ['تطبيق القيد المزدوج', 'إعداد القوائم المالية الرئيسية', 'شرح المبادئ المحاسبية الأساسية', 'حساب النسب المالية الأساسية وتفسيرها'],
    modules: [['Recording', 'التسجيل', ['The accounting equation', 'Journals', 'Ledgers'], ['المعادلة المحاسبية', 'اليومية', 'دفتر الأستاذ']],
      ['Statements', 'القوائم', ['Trial balance', 'Income statement', 'Balance sheet'], ['ميزان المراجعة', 'قائمة الدخل', 'الميزانية العمومية']],
      ['Analysis', 'التحليل', ['Cash flow', 'Ratios', 'Reporting standards'], ['التدفقات النقدية', 'النسب', 'معايير التقارير']]] },
  { code: 'AR101', dept: 'arabic-language', en: 'Classical Arabic Texts', ar: 'نصوص عربية كلاسيكية', cr: 3, instr: 'yousef-rahman', price: 0,
    descEn: 'A guided reading of landmark Arabic prose and poetry, from the pre-Islamic odes to the great essayists. Free and open to everyone.',
    descAr: 'قراءة موجّهة لأبرز النصوص النثرية والشعرية العربية، من المعلقات إلى كبار الكتّاب. مجاني ومتاح للجميع.',
    outEn: ['Read classical texts with growing independence', 'Recognise major genres and periods', 'Discuss style, rhetoric and meaning', 'Write a short analytical commentary'],
    outAr: ['قراءة النصوص الكلاسيكية باستقلالية متزايدة', 'التعرف على الأجناس والعصور الأدبية الكبرى', 'مناقشة الأسلوب والبلاغة والمعنى', 'كتابة تعليق تحليلي قصير'],
    modules: [['Poetry', 'الشعر', ['The Mu\'allaqat', 'Abbasid poetry', 'Metre and rhyme'], ['المعلقات', 'الشعر العباسي', 'الوزن والقافية']],
      ['Prose', 'النثر', ['Al-Jahiz', 'Maqamat', 'Letters'], ['الجاحظ', 'المقامات', 'الرسائل']],
      ['Reading closely', 'القراءة المتأنية', ['Rhetoric', 'Commentary', 'Final essay'], ['البلاغة', 'التعليق', 'المقال الختامي']]] },
  { code: 'ED201', dept: 'education', en: 'Curriculum Design', ar: 'تصميم المناهج', cr: 3, instr: 'huda-salem', price: 350,
    descEn: 'Plan units and lessons that start from clear goals. You design a complete unit with aligned activities and assessment, and receive feedback from peers and tutors.',
    descAr: 'خطّط وحدات ودروساً تنطلق من أهداف واضحة. تصمم وحدة كاملة بأنشطة وتقييم متوائمين، وتتلقى ملاحظات من الزملاء والمحاضرين.',
    outEn: ['Write clear, measurable learning outcomes', 'Design units using backward design', 'Align activities with assessment', 'Adapt plans for diverse learners'],
    outAr: ['صياغة مخرجات تعلم واضحة وقابلة للقياس', 'تصميم الوحدات بأسلوب التصميم العكسي', 'مواءمة الأنشطة مع التقييم', 'تكييف الخطط لمتعلمين متنوعين'],
    modules: [['Purpose', 'الغاية', ['Learning outcomes', 'Standards', 'Learner needs'], ['مخرجات التعلم', 'المعايير', 'احتياجات المتعلمين']],
      ['Design', 'التصميم', ['Backward design', 'Activities', 'Resources'], ['التصميم العكسي', 'الأنشطة', 'المصادر']],
      ['Assessment', 'التقييم', ['Formative assessment', 'Rubrics', 'Unit review'], ['التقييم التكويني', 'سلالم التقدير', 'مراجعة الوحدة']]] },
];

// ───────────────────────── Programmes ─────────────────────────

const PROGRAMS = [
  { slug: 'bsc-computer-science', dept: 'computer-science', level: 'BACHELOR' as const, en: 'BSc in Computer Science', ar: 'بكالوريوس علوم الحاسوب', years: 4, credits: 120, featured: true, image: 'programs/bsc-computer-science',
    curriculum: [['CS101', 1], ['CS201', 2], ['DS210', 2], ['DS320', 3]] as [string, number][],
    sumEn: 'Programming, algorithms, data and intelligent systems, built up through four years of projects.', sumAr: 'البرمجة والخوارزميات والبيانات والأنظمة الذكية عبر أربع سنوات من المشاريع.',
    careersEn: ['Software developer', 'Data analyst', 'Machine learning engineer', 'Systems analyst'], careersAr: ['مطوّر برمجيات', 'محلل بيانات', 'مهندس تعلّم آلة', 'محلل أنظمة'] },
  { slug: 'msc-data-science', dept: 'computer-science', level: 'MASTER' as const, en: 'MSc in Data Science', ar: 'ماجستير علم البيانات', years: 2, credits: 36, featured: true, image: 'programs/msc-data-science',
    curriculum: [['DS210', 1], ['DS320', 1]] as [string, number][],
    sumEn: 'Advanced statistics, machine learning and data engineering for working professionals.', sumAr: 'الإحصاء المتقدم وتعلّم الآلة وهندسة البيانات للمهنيين.',
    careersEn: ['Data scientist', 'Analytics manager', 'AI product specialist', 'Research analyst'], careersAr: ['عالم بيانات', 'مدير تحليلات', 'أخصائي منتجات الذكاء الاصطناعي', 'محلل أبحاث'] },
  { slug: 'bba', dept: 'business-administration', level: 'BACHELOR' as const, en: 'Bachelor of Business Administration', ar: 'بكالوريوس إدارة الأعمال', years: 4, credits: 120, featured: true, image: 'programs/bba',
    curriculum: [['BA101', 1], ['AF110', 1], ['BA220', 2]] as [string, number][],
    sumEn: 'A broad business foundation with specialist tracks in management, analytics and finance.', sumAr: 'أساس واسع في الأعمال مع مسارات تخصصية في الإدارة والتحليلات والتمويل.',
    careersEn: ['Business analyst', 'Project coordinator', 'Marketing executive', 'Entrepreneur'], careersAr: ['محلل أعمال', 'منسق مشاريع', 'تنفيذي تسويق', 'رائد أعمال'] },
  { slug: 'mba', dept: 'business-administration', level: 'MASTER' as const, en: 'Master of Business Administration', ar: 'ماجستير إدارة الأعمال', years: 2, credits: 42, featured: false, image: 'programs/mba',
    curriculum: [['BA220', 1]] as [string, number][],
    sumEn: 'Strategic leadership for experienced professionals, with evening and weekend study.', sumAr: 'قيادة استراتيجية للمهنيين ذوي الخبرة، مع دراسة مسائية وفي عطلة نهاية الأسبوع.',
    careersEn: ['Senior manager', 'Strategy consultant', 'Business unit head', 'Founder'], careersAr: ['مدير أول', 'مستشار استراتيجي', 'رئيس وحدة أعمال', 'مؤسس شركة'] },
  { slug: 'ba-arabic', dept: 'arabic-language', level: 'BACHELOR' as const, en: 'BA in Arabic Language & Literature', ar: 'بكالوريوس اللغة العربية وآدابها', years: 4, credits: 120, featured: false, image: 'programs/ba-arabic',
    curriculum: [['AR101', 1]] as [string, number][],
    sumEn: 'Language, literature and translation, from classical texts to contemporary Gulf writing.', sumAr: 'اللغة والأدب والترجمة، من النصوص الكلاسيكية إلى الكتابة الخليجية المعاصرة.',
    careersEn: ['Arabic teacher', 'Translator', 'Editor and writer', 'Cultural heritage specialist'], careersAr: ['معلم لغة عربية', 'مترجم', 'محرر وكاتب', 'أخصائي تراث ثقافي'] },
  { slug: 'diploma-teaching', dept: 'education', level: 'DIPLOMA' as const, en: 'Professional Diploma in Teaching', ar: 'الدبلوم المهني في التدريس', years: 1, credits: 24, featured: false, image: 'programs/diploma-teaching',
    curriculum: [['ED201', 1]] as [string, number][],
    sumEn: 'A one-year practical route into teaching, with supervised classroom placements.', sumAr: 'مسار عملي لمدة عام واحد إلى مهنة التدريس، مع تدريب صفي تحت الإشراف.',
    careersEn: ['School teacher', 'Curriculum coordinator', 'Learning designer', 'Education officer'], careersAr: ['معلم مدرسة', 'منسق مناهج', 'مصمم تعلّم', 'مسؤول تربوي'] },
];

async function seed() {
  // Faculty
  const fac = new Map<string, string>();
  for (const f of FACULTY) {
    const data = {
      slug: f.slug, fullNameEn: f.en, fullNameAr: f.ar, titleEn: f.titleEn, titleAr: f.titleAr, email: null, photoPath: null,
      specializationEn: f.specEn, specializationAr: f.specAr,
      bioEn: `${f.en} teaches and researches in ${f.specEn.toLowerCase()}. Their teaching links theory to practice through case studies and projects, and they supervise student research in the field.`,
      bioAr: `يعمل ${f.ar} في التدريس والبحث في مجال ${f.specAr}، ويربط في تدريسه بين النظرية والتطبيق من خلال دراسات الحالة والمشاريع، ويشرف على أبحاث الطلبة في هذا المجال.`,
      education: [], researchInterestsEn: [f.specEn, 'Higher education', 'Digital learning'], researchInterestsAr: [f.specAr, 'التعليم العالي', 'التعلّم الرقمي'],
      awards: [], consentToPublish: true, ...OK,
    };
    const r = await upsert(() => prisma.facultyMember.findUnique({ where: { slug: f.slug } }), () => prisma.facultyMember.findUnique({ where: { slug: `demo-${f.slug}` } }),
      () => prisma.facultyMember.create({ data }), (id) => prisma.facultyMember.update({ where: { id }, data }));
    fac.set(f.slug, r.id);
  }
  // Colleges & departments
  const dept = new Map<string, string>();
  let ci = 0;
  for (const c of COLLEGES) {
    const { departments, dean, en, ar, ...rest } = c;
    const data = { ...rest, nameEn: en, nameAr: ar, sortOrder: ++ci, deanId: fac.get(dean) ?? null, ...OK };
    const college = await upsert(() => prisma.college.findUnique({ where: { slug: c.slug } }), () => prisma.college.findUnique({ where: { slug: `demo-${c.slug}` } }),
      () => prisma.college.create({ data }), (id) => prisma.college.update({ where: { id }, data }));
    let di = 0;
    for (const d of departments) {
      const ddata = {
        slug: d.slug, collegeId: college.id, nameEn: d.en, nameAr: d.ar, sortOrder: ++di, headId: fac.get(d.head) ?? null, imagePath: d.imagePath,
        overviewEn: `The Department of ${d.en} offers teaching and research in ${d.focusEn}. Small classes, applied projects and close contact with faculty help students move from foundations to independent work.`,
        overviewAr: `يقدّم قسم ${d.ar} التدريس والبحث في ${d.focusAr}. وتساعد الصفوف الصغيرة والمشاريع التطبيقية والتواصل الوثيق مع أعضاء هيئة التدريس الطلبةَ على الانتقال من الأسس إلى العمل المستقل.`,
        objectivesEn: ['Build strong foundations in the discipline', 'Develop practical, career-ready skills', 'Encourage research and critical thinking', 'Serve the community in Dubai and the region'],
        objectivesAr: ['بناء أسس متينة في التخصص', 'تنمية مهارات عملية جاهزة لسوق العمل', 'تشجيع البحث والتفكير النقدي', 'خدمة المجتمع في دبي والمنطقة'],
        researchAreasEn: d.areasEn, researchAreasAr: d.areasAr, contactEmail: null, ...OK,
      };
      const dep = await upsert(() => prisma.department.findUnique({ where: { slug: d.slug } }), () => prisma.department.findUnique({ where: { slug: `demo-${d.slug}` } }),
        () => prisma.department.create({ data: ddata }), (id) => prisma.department.update({ where: { id }, data: ddata }));
      dept.set(d.slug, dep.id);
    }
  }
  for (const f of FACULTY) {
    const fid = fac.get(f.slug), did = dept.get(f.dept);
    if (fid && did) await prisma.facultyMember.update({ where: { id: fid }, data: { departments: { set: [{ id: did }] } } });
  }
  // Courses
  const course = new Map<string, string>();
  for (const c of COURSES) {
    const did = dept.get(c.dept)!;
    const data = {
      slug: c.code.toLowerCase(), code: c.code, departmentId: did, titleEn: c.en, titleAr: c.ar, creditHours: c.cr, courseType: 'Core', isFeatured: !!c.featured,
      instructorId: fac.get(c.instr) ?? null, imagePath: img(`courses/${c.code.toLowerCase()}`),
      descriptionEn: c.descEn, descriptionAr: c.descAr, outcomesEn: c.outEn, outcomesAr: c.outAr,
      syllabus: c.modules.map(([en, ar, tEn, tAr], i) => ({ module: `Module ${i + 1}: ${en}`, moduleAr: `الوحدة ${i + 1}: ${ar}`, topicsEn: tEn, topicsAr: tAr })),
      assessment: [{ labelEn: 'Coursework', labelAr: 'الأعمال الفصلية', weight: 40 }, { labelEn: 'Project', labelAr: 'المشروع', weight: 30 }, { labelEn: 'Final quiz', labelAr: 'الاختبار النهائي', weight: 30 }],
      onlineEnabled: true, deliveryMode: c.live ? ('LIVE' as const) : ('RECORDED' as const), priceFils: c.price * 100, currency: 'AED', ...OK,
    };
    const r = await upsert(() => prisma.course.findUnique({ where: { code: c.code } }), () => prisma.course.findUnique({ where: { code: `DEMO-${c.code}` } }),
      () => prisma.course.create({ data }), (id) => prisma.course.update({ where: { id }, data }));
    course.set(c.code, r.id);
  }
  for (const c of COURSES) {
    const id = course.get(c.code)!;
    await prisma.coursePrerequisite.deleteMany({ where: { courseId: id } });
    const pre = c.prereq && course.get(c.prereq);
    if (pre) await prisma.coursePrerequisite.create({ data: { courseId: id, prerequisiteId: pre } });
  }
  // Programmes
  for (const p of PROGRAMS) {
    const did = dept.get(p.dept)!;
    const deptName = COLLEGES.flatMap((c) => c.departments).find((d) => d.slug === p.dept)!;
    const data = {
      slug: p.slug, departmentId: did, degreeLevel: p.level, nameEn: p.en, nameAr: p.ar, durationYears: p.years, totalCredits: p.credits, isFeatured: p.featured,
      category: p.dept, imagePath: img(p.image), summaryEn: p.sumEn, summaryAr: p.sumAr,
      overviewEn: `The ${p.en} is offered by the Department of ${deptName.en}. ${p.sumEn} Teaching mixes lectures, workshops and supervised projects, and students graduate with a portfolio of work that shows what they can do.`,
      overviewAr: `يقدّم قسم ${deptName.ar} برنامج ${p.ar}. ${p.sumAr} ويجمع التدريس بين المحاضرات وورش العمل والمشاريع تحت الإشراف، ويتخرج الطلبة بملف أعمال يبيّن قدراتهم.`,
      outcomesEn: ['Apply core knowledge of the discipline to real problems', 'Communicate ideas clearly in English and Arabic', 'Work effectively in teams and lead projects', 'Act with integrity and professional responsibility'],
      outcomesAr: ['تطبيق المعرفة الأساسية في التخصص على مشكلات حقيقية', 'عرض الأفكار بوضوح باللغتين العربية والإنجليزية', 'العمل بفاعلية ضمن فرق وقيادة المشاريع', 'التصرف بنزاهة ومسؤولية مهنية'],
      requirementsEn: p.level === 'MASTER'
        ? ['A recognised bachelor\'s degree in a related field', 'English language proficiency', 'Statement of purpose and CV']
        : ['UAE secondary school certificate or equivalent', 'English language proficiency', 'Passport and Emirates ID copies'],
      requirementsAr: p.level === 'MASTER'
        ? ['درجة بكالوريوس معترف بها في مجال ذي صلة', 'إتقان اللغة الإنجليزية', 'خطاب الغرض والسيرة الذاتية']
        : ['شهادة الثانوية العامة الإماراتية أو ما يعادلها', 'إتقان اللغة الإنجليزية', 'نسخة من جواز السفر والهوية الإماراتية'],
      careersEn: p.careersEn, careersAr: p.careersAr, ...OK,
    };
    const prog = await upsert(() => prisma.program.findUnique({ where: { slug: p.slug } }), () => prisma.program.findUnique({ where: { slug: `demo-${p.slug}` } }),
      () => prisma.program.create({ data }), (id) => prisma.program.update({ where: { id }, data }));
    await prisma.programCourse.deleteMany({ where: { programId: prog.id } });
    for (const [code, year] of p.curriculum) {
      const cid = course.get(code);
      if (cid) await prisma.programCourse.create({ data: { programId: prog.id, courseId: cid, year, term: 1 } });
    }
    for (const q of ['UAE_SECONDARY_ADVANCED', 'IB_DIPLOMA'] as const) {
      const rule = { minOverallPercent: 75, subjectMinimums: [{ subject: 'Mathematics', minPercent: 70 }], notesEn: 'Minimum entry requirement', notesAr: 'الحد الأدنى لمتطلبات القبول' };
      await prisma.eligibilityRule.upsert({
        where: { programId_qualification: { programId: prog.id, qualification: q } },
        create: { programId: prog.id, qualification: q, ...rule },
        update: { notesEn: rule.notesEn, notesAr: rule.notesAr },
      });
    }
  }
  // News
  const NEWS = [
    { slug: 'library-reading-week', cat: 'student-life', image: 'news/library-week', days: -3, featured: true,
      en: 'Reading week brings students back to the library', ar: 'أسبوع القراءة يعيد الطلبة إلى المكتبة',
      exEn: 'A week of reading circles, author talks and quiet study sessions celebrated the joy of books.', exAr: 'أسبوع من حلقات القراءة ولقاءات الكتّاب وجلسات الدراسة الهادئة احتفاءً بمتعة الكتب.' },
    { slug: 'research-seminar-series', cat: 'research', image: 'news/research-seminar', days: -10,
      en: 'New research seminar series announced', ar: 'الإعلان عن سلسلة ندوات بحثية جديدة',
      exEn: 'Monthly seminars will bring faculty, students and guest speakers together to share work in progress.', exAr: 'ستجمع الندوات الشهرية أعضاء هيئة التدريس والطلبة والمتحدثين الضيوف لعرض أعمالهم البحثية الجارية.' },
    { slug: 'new-student-orientation', cat: 'academic', image: 'news/orientation', days: -18,
      en: 'Orientation programme welcomes new students', ar: 'البرنامج التعريفي يرحّب بالطلبة الجدد',
      exEn: 'New students met their advisers, toured the facilities and set up their online learning accounts.', exAr: 'التقى الطلبة الجدد بمرشديهم الأكاديميين، وتجوّلوا في المرافق، وفعّلوا حساباتهم في منصة التعلّم الإلكتروني.' },
    { slug: 'online-courses-open', cat: 'announcement', image: 'news/admissions-enquiries', days: -1, announcement: true,
      en: 'Online courses are now open for enrolment', ar: 'باب التسجيل في المقررات الإلكترونية مفتوح الآن',
      exEn: 'Create an account, choose a course and start learning today, with recorded lessons, live classes, notes and quizzes.', exAr: 'أنشئ حساباً واختر مقرراً وابدأ التعلّم اليوم، مع دروس مسجلة وحصص مباشرة وملاحظات واختبارات قصيرة.' },
  ];
  for (const n of NEWS) {
    const data = {
      slug: n.slug, category: n.cat, titleEn: n.en, titleAr: n.ar, isFeatured: !!n.featured, isAnnouncement: !!n.announcement, publishedAt: days(n.days),
      imagePath: img(n.image), excerptEn: n.exEn, excerptAr: n.exAr,
      bodyEn: `${n.exEn}\n\n## Highlights\n\n- Open to all students and staff\n- Sessions led by faculty and invited guests\n- Materials shared on the learning platform afterwards\n\nFollow the news and events pages for upcoming dates.`,
      bodyAr: `${n.exAr}\n\n## أبرز ما جرى\n\n- مفتوح لجميع الطلبة والموظفين\n- جلسات يقودها أعضاء هيئة التدريس وضيوف مدعوون\n- مشاركة المواد على منصة التعلّم بعد ذلك\n\nتابعوا صفحتي الأخبار والفعاليات لمعرفة المواعيد القادمة.`,
      quoteEn: null, quoteAr: null, quoteByEn: null, quoteByAr: null, ...LIVE,
    };
    await upsert(() => prisma.newsArticle.findUnique({ where: { slug: n.slug } }), () => prisma.newsArticle.findUnique({ where: { slug: legacyNews[n.slug] } }),
      () => prisma.newsArticle.create({ data }), (id) => prisma.newsArticle.update({ where: { id }, data }));
  }
  // Events (relative to today so upcoming and past both have entries)
  const EVENTS = [
    { slug: 'open-day', cat: 'academic', image: 'events/open-day', d: 5, featured: true, en: 'Open day', ar: 'اليوم المفتوح',
      sumEn: 'Meet faculty, explore programmes and get your questions about online study answered.', sumAr: 'التقِ بأعضاء هيئة التدريس، واستكشف البرامج، واحصل على إجابات أسئلتك حول الدراسة الإلكترونية.' },
    { slug: 'talk-education-in-dubai', cat: 'cultural', image: 'events/heritage-talk', d: 12, en: 'Talk: A century of education in Dubai', ar: 'محاضرة: قرن من التعليم في دبي',
      sumEn: 'From the first classes at Al Ahmadiya in 1912 to today: how learning has shaped the city.', sumAr: 'من الصفوف الأولى في الأحمدية عام 1912 حتى اليوم: كيف شكّل التعليم المدينة.' },
    { slug: 'academic-writing-workshop', cat: 'workshop', image: 'events/writing-workshop', d: 20, en: 'Academic writing workshop', ar: 'ورشة الكتابة الأكاديمية',
      sumEn: 'A hands-on session on structuring essays, citing sources and giving feedback to peers.', sumAr: 'جلسة تطبيقية حول بناء المقالات وتوثيق المصادر وتقديم الملاحظات للزملاء.' },
    { slug: 'research-symposium', cat: 'research', image: 'events/research-symposium', d: -14, en: 'Research symposium', ar: 'الندوة البحثية',
      sumEn: 'Faculty and graduate students presented current research across all three colleges.', sumAr: 'عرض أعضاء هيئة التدريس وطلبة الدراسات العليا أبحاثهم الحالية في الكليات الثلاث.' },
    { slug: 'sports-day', cat: 'sports', image: 'events/sports-day', d: -30, en: 'Sports day', ar: 'اليوم الرياضي',
      sumEn: 'A day of friendly competition, team games and fitness challenges.', sumAr: 'يوم من المنافسات الودية والألعاب الجماعية وتحديات اللياقة.' },
  ];
  for (const e of EVENTS) {
    const data = {
      slug: e.slug, category: e.cat, titleEn: e.en, titleAr: e.ar, isFeatured: !!e.featured, startsAt: days(e.d, 9), endsAt: days(e.d, 13), imagePath: img(e.image),
      summaryEn: e.sumEn, summaryAr: e.sumAr,
      overviewEn: `${e.sumEn} The programme below lists the main sessions. Everyone is welcome; please register in advance so we can plan seating.`,
      overviewAr: `${e.sumAr} يوضح الجدول أدناه الجلسات الرئيسية. الدعوة عامة للجميع، ونرجو التسجيل المسبق لتنظيم المقاعد.`,
      venueEn: 'Main hall', venueAr: 'القاعة الرئيسية', ...LIVE,
    };
    const ev = await upsert(() => prisma.event.findUnique({ where: { slug: e.slug } }), () => prisma.event.findUnique({ where: { slug: legacyEvents[e.slug] } }),
      () => prisma.event.create({ data }), (id) => prisma.event.update({ where: { id }, data }));
    await prisma.eventAgendaItem.deleteMany({ where: { eventId: ev.id } });
    await prisma.eventSpeaker.deleteMany({ where: { eventId: ev.id } });
    await prisma.faq.deleteMany({ where: { eventId: ev.id } });
    await prisma.eventAgendaItem.createMany({
      data: [
        { eventId: ev.id, startsAt: days(e.d, 9), endsAt: days(e.d, 10), titleEn: 'Registration & welcome', titleAr: 'التسجيل والترحيب' },
        { eventId: ev.id, startsAt: days(e.d, 10), endsAt: days(e.d, 12), titleEn: 'Main session', titleAr: 'الجلسة الرئيسية' },
        { eventId: ev.id, startsAt: days(e.d, 12), endsAt: days(e.d, 13), titleEn: 'Closing remarks', titleAr: 'الكلمة الختامية' },
      ],
    });
    await prisma.eventSpeaker.createMany({ data: FACULTY.slice(0, 3).map((f) => ({ eventId: ev.id, facultyId: fac.get(f.slug) ?? null, nameEn: f.en, nameAr: f.ar, roleEn: f.titleEn, roleAr: f.titleAr })) });
    await prisma.faq.create({ data: { scope: 'event', eventId: ev.id, questionEn: 'Do I need to register?', questionAr: 'هل أحتاج إلى التسجيل؟', answerEn: 'Entry is free, but registering helps us plan seating and send you reminders.', answerAr: 'الدخول مجاني، لكن التسجيل يساعدنا على تنظيم المقاعد وإرسال التذكيرات إليك.', ...SHOWN } });
  }
  // Publications
  const PUBS = [
    { slug: 'learning-analytics-higher-education', type: 'journal-article', image: 'research/learning-analytics', authors: ['karim-nasser', 'huda-salem'], year: 2025, featured: true,
      en: 'Learning analytics in higher education: from dashboards to decisions', ar: 'تحليلات التعلّم في التعليم العالي: من لوحات المعلومات إلى القرارات', kw: ['learning analytics', 'higher education', 'student success'] },
    { slug: 'governance-family-businesses', type: 'conference', image: 'research/family-business', authors: ['omar-farouk', 'layla-haddad'], year: 2024,
      en: 'Governance and succession in Gulf family businesses', ar: 'الحوكمة والتعاقب في الشركات العائلية الخليجية', kw: ['family business', 'governance', 'succession'] },
    { slug: 'early-arabic-school-texts', type: 'book', image: 'research/arabic-school-texts', authors: ['yousef-rahman'], year: 2024,
      en: 'Reading early Arabic school texts', ar: 'قراءة في النصوص المدرسية العربية المبكرة', kw: ['Arabic literature', 'education history', 'Gulf heritage'] },
    { slug: 'assessment-practices-survey', type: 'report', image: 'research/assessment-practices', authors: ['huda-salem', 'noura-saeed'], year: 2023,
      en: 'Assessment practices in UAE classrooms: a survey', ar: 'ممارسات التقييم في الصفوف الإماراتية: دراسة مسحية', kw: ['assessment', 'teacher practice', 'UAE'] },
  ];
  for (const p of PUBS) {
    const data = {
      slug: p.slug, type: p.type, titleEn: p.en, titleAr: p.ar, isFeatured: !!p.featured, publishedOn: new Date(`${p.year}-05-15`), coverPath: img(p.image),
      journal: null, doi: null, fullTextUrl: null,
      abstractEn: `This work examines ${p.kw[0]} with a focus on ${p.kw[1]} and ${p.kw[2]}. It reviews recent literature, draws on regional evidence and sets out practical recommendations for institutions and practitioners.`,
      abstractAr: `يتناول هذا العمل موضوع «${p.ar}»، فيراجع الدراسات الحديثة ويستند إلى شواهد من المنطقة، ويقدّم توصيات عملية للمؤسسات والممارسين.`,
      findingsEn: ['Clear goals matter more than tools', 'Local context shapes what works', 'Practitioners need time and support to change practice'],
      findingsAr: ['وضوح الأهداف أهم من الأدوات', 'السياق المحلي يحدد ما ينجح', 'يحتاج الممارسون إلى الوقت والدعم لتغيير ممارساتهم'],
      keywords: p.kw, ...OK,
    };
    const pub = await upsert(() => prisma.publication.findUnique({ where: { slug: p.slug } }), () => prisma.publication.findUnique({ where: { slug: legacyPubs[p.slug] } }),
      () => prisma.publication.create({ data }), (id) => prisma.publication.update({ where: { id }, data }));
    await prisma.publicationAuthor.deleteMany({ where: { publicationId: pub.id } });
    await prisma.publicationAuthor.createMany({
      data: p.authors.map((slug, i) => {
        const f = FACULTY.find((x) => x.slug === slug)!;
        return { publicationId: pub.id, facultyId: fac.get(slug) ?? null, name: f.en, affiliation: `Department of ${f.specEn}`, position: i + 1 };
      }),
    });
  }
  // FAQs (programmes & admissions) — replace the general set
  const FAQS = [
    { scope: 'programs', qEn: 'How long are the programmes?', qAr: 'ما مدة البرامج؟',
      aEn: 'Bachelor\'s programmes take four years, master\'s programmes two years and the professional diploma one year of full-time study. Each programme page shows its duration and credits.',
      aAr: 'تستغرق برامج البكالوريوس أربع سنوات، والماجستير سنتين، والدبلوم المهني سنة واحدة بدوام كامل. وتوضح صفحة كل برنامج مدته وساعاته المعتمدة.' },
    { scope: 'programs', qEn: 'Can I take a single course online without joining a programme?', qAr: 'هل يمكنني دراسة مقرر واحد عبر الإنترنت دون الالتحاق ببرنامج؟',
      aEn: 'Yes. Open any course page, create an account and enrol. Free courses start immediately; paid courses start as soon as payment is confirmed.',
      aAr: 'نعم. افتح صفحة أي مقرر، وأنشئ حساباً، ثم سجّل. تبدأ المقررات المجانية فوراً، وتبدأ المقررات المدفوعة فور تأكيد الدفع.' },
    { scope: 'admissions', qEn: 'How do I apply?', qAr: 'كيف أقدّم طلبي؟',
      aEn: 'Use the eligibility checker to see which programmes match your qualifications, then create an account and complete the online application. The application fee is paid at the last step.',
      aAr: 'استخدم أداة التحقق من الأهلية لمعرفة البرامج المناسبة لمؤهلاتك، ثم أنشئ حساباً وأكمل الطلب الإلكتروني. تُدفع رسوم الطلب في الخطوة الأخيرة.' },
  ];
  await prisma.faq.deleteMany({ where: { eventId: null, OR: [{ isDemo: true }, { questionEn: { in: FAQS.map((f) => f.qEn) } }] } });
  await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ scope: f.scope, questionEn: f.qEn, questionAr: f.qAr, answerEn: f.aEn, answerAr: f.aAr, sortOrder: i, ...SHOWN })) });
  // Campus tour stops
  const STOPS = [
    ['academic', 'academic', 'Academic blocks', 'المباني الأكاديمية', 'Lecture theatres, seminar rooms and faculty offices.', 'قاعات المحاضرات وغرف الندوات ومكاتب أعضاء هيئة التدريس.'],
    ['library', 'library', 'Library', 'المكتبة', 'Quiet study floors, group rooms and digital collections.', 'طوابق للدراسة الهادئة وغرف للعمل الجماعي ومجموعات رقمية.'],
    ['research', 'research', 'Research centre', 'مركز الأبحاث', 'Computer labs and project studios for teaching and research.', 'مختبرات حاسوب واستوديوهات مشاريع للتدريس والبحث.'],
    ['sports', 'sports', 'Sports complex', 'المجمع الرياضي', 'Indoor courts and fitness facilities for students and staff.', 'ملاعب داخلية ومرافق لياقة للطلبة والموظفين.'],
    ['student-life', 'student-life', 'Student life', 'الحياة الطلابية', 'Green spaces, clubs and places to meet between classes.', 'مساحات خضراء وأندية وأماكن للقاء بين المحاضرات.'],
  ] as const;
  for (const [i, [key, kind, en, ar, dEn, dAr]] of STOPS.entries()) {
    const slug = `tour-${key}`;
    const data = { slug, kind, titleEn: en, titleAr: ar, descriptionEn: dEn, descriptionAr: dAr, imagePath: img(`campus/${key}`), sortOrder: i, ...SHOWN };
    await upsert(() => prisma.campusTourStop.findUnique({ where: { slug } }), () => prisma.campusTourStop.findUnique({ where: { slug: `demo-${slug}` } }),
      () => prisma.campusTourStop.create({ data }), (id) => prisma.campusTourStop.update({ where: { id }, data }));
  }

  const left = await prisma.course.count({ where: { isDemo: true } }) + await prisma.program.count({ where: { isDemo: true } }) + await prisma.facultyMember.count({ where: { isDemo: true } });
  console.log(`Content ready: ${COLLEGES.length} colleges, ${dept.size} departments, ${PROGRAMS.length} programmes, ${COURSES.length} courses, ${FACULTY.length} faculty, ${NEWS.length} news, ${EVENTS.length} events, ${PUBS.length} publications.`);
  if (left) console.warn(`${left} older preview record(s) are still flagged isDemo and stay hidden.`);
}

const legacyNews: Record<string, string> = {
  'library-reading-week': 'demo-news-library-week', 'research-seminar-series': 'demo-news-research-seminar',
  'new-student-orientation': 'demo-news-orientation', 'online-courses-open': 'demo-news-announcement',
};
const legacyEvents: Record<string, string> = {
  'open-day': 'demo-event-open-day', 'talk-education-in-dubai': 'demo-event-heritage-talk', 'academic-writing-workshop': 'demo-event-workshop',
  'research-symposium': 'demo-event-symposium', 'sports-day': 'demo-event-sports-day',
};
const legacyPubs: Record<string, string> = {
  'learning-analytics-higher-education': 'demo-pub-learning-analytics', 'governance-family-businesses': 'demo-pub-family-business',
  'early-arabic-school-texts': 'demo-pub-arabic-manuscripts', 'assessment-practices-survey': 'demo-pub-assessment',
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
