/**
 * Public website content (frontend preview). Generated from apps/api/prisma/seed-content.ts so the website
 * and the database seed describe the same proposed programmes and courses.
 *
 * Status: the university is a proposal. Programmes, courses, prices and faculty profiles are illustrative and
 * marked CLIENT_CONFIRMATION_REQUIRED until Al Ahmadiya confirms them. No rankings, awards, results or
 * statistics are stated here.
 */
/* eslint-disable */
export const CONTENT = {
 "colleges": [
  {
   "id": "college-college-of-business",
   "slug": "college-of-business",
   "nameEn": "College of Business",
   "nameAr": "كلية الأعمال",
   "summaryEn": "Management, analytics, accounting and finance for a fast-moving regional economy.",
   "summaryAr": "الإدارة والتحليلات والمحاسبة والتمويل لاقتصاد إقليمي سريع النمو.",
   "imagePath": "/images/colleges/business.jpg",
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "departments": [
    {
     "id": "dept-business-administration",
     "slug": "business-administration",
     "nameEn": "Business Administration",
     "nameAr": "إدارة الأعمال"
    },
    {
     "id": "dept-accounting-finance",
     "slug": "accounting-finance",
     "nameEn": "Accounting & Finance",
     "nameAr": "المحاسبة والتمويل"
    }
   ],
   "overviewEn": "The College of Business prepares graduates to lead organisations in Dubai and the wider region. Teaching combines sound theory with case studies drawn from local family businesses, government entities and international firms, and every programme includes applied projects with industry partners.",
   "overviewAr": "تُعدّ كلية الأعمال خريجين قادرين على قيادة المؤسسات في دبي والمنطقة. ويجمع التدريس بين الأسس النظرية ودراسات الحالة المستمدة من الشركات العائلية المحلية والجهات الحكومية والشركات الدولية، ويتضمن كل برنامج مشاريع تطبيقية مع شركاء من القطاع.",
   "visionEn": "To be a trusted source of business leaders who combine global practice with regional insight.",
   "visionAr": "أن نكون مصدراً موثوقاً لقادة أعمال يجمعون بين الممارسة العالمية والفهم العميق للمنطقة.",
   "missionEn": "To educate ethical, analytical and entrepreneurial graduates through practice-led teaching and close links with employers.",
   "missionAr": "إعداد خريجين ملتزمين أخلاقياً ومتمكنين تحليلياً وروّاد أعمال، من خلال تعليم قائم على الممارسة وشراكات وثيقة مع جهات التوظيف.",
   "dean": "omar-farouk"
  },
  {
   "id": "college-college-of-computing",
   "slug": "college-of-computing",
   "nameEn": "College of Computing & Technology",
   "nameAr": "كلية الحوسبة والتقنية",
   "summaryEn": "Software, data and intelligent systems taught through hands-on projects.",
   "summaryAr": "البرمجيات والبيانات والأنظمة الذكية من خلال مشاريع تطبيقية.",
   "imagePath": "/images/colleges/computing.jpg",
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "departments": [
    {
     "id": "dept-computer-science",
     "slug": "computer-science",
     "nameEn": "Computer Science",
     "nameAr": "علوم الحاسوب"
    }
   ],
   "overviewEn": "The College of Computing & Technology brings together software engineering, data science and artificial intelligence. Students spend much of their time in labs and studios, building working systems in teams and presenting them to faculty and industry reviewers.",
   "overviewAr": "تجمع كلية الحوسبة والتقنية بين هندسة البرمجيات وعلم البيانات والذكاء الاصطناعي. ويقضي الطلبة جزءاً كبيراً من وقتهم في المختبرات، يبنون أنظمة عاملة ضمن فرق ويعرضونها على أعضاء هيئة التدريس ومراجعين من القطاع.",
   "visionEn": "To shape technologists who build responsible digital solutions for the region.",
   "visionAr": "إعداد تقنيين يبنون حلولاً رقمية مسؤولة تخدم المنطقة.",
   "missionEn": "To combine rigorous computing foundations with project-based learning and ethical practice.",
   "missionAr": "الجمع بين أسس حوسبة متينة والتعلم القائم على المشاريع والممارسة الأخلاقية.",
   "dean": "maryam-khalil"
  },
  {
   "id": "college-college-of-humanities",
   "slug": "college-of-humanities",
   "nameEn": "College of Humanities & Education",
   "nameAr": "كلية العلوم الإنسانية والتربية",
   "summaryEn": "Arabic language, literature and teacher education, continuing a tradition that began in 1912.",
   "summaryAr": "اللغة العربية وآدابها وإعداد المعلمين، امتداداً لتقليد بدأ عام 1912.",
   "imagePath": "/images/colleges/humanities.jpg",
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "departments": [
    {
     "id": "dept-arabic-language",
     "slug": "arabic-language",
     "nameEn": "Arabic Language & Literature",
     "nameAr": "اللغة العربية وآدابها"
    },
    {
     "id": "dept-education",
     "slug": "education",
     "nameEn": "Education",
     "nameAr": "التربية"
    }
   ],
   "overviewEn": "The College of Humanities & Education carries forward the founding purpose of Al Ahmadiya: teaching Arabic and preparing those who teach. Its departments combine close reading of classical and modern texts with contemporary approaches to curriculum, assessment and classroom practice.",
   "overviewAr": "تواصل كلية العلوم الإنسانية والتربية الغاية التي تأسست من أجلها الأحمدية: تعليم العربية وإعداد من يعلّمها. وتجمع أقسامها بين القراءة المتأنية للنصوص الكلاسيكية والحديثة والمناهج المعاصرة في تصميم المقررات والتقييم والممارسة الصفية.",
   "visionEn": "To keep Arabic scholarship and good teaching at the heart of education in Dubai.",
   "visionAr": "أن تبقى الدراسات العربية والتعليم المتميز في صميم التعليم في دبي.",
   "missionEn": "To develop confident readers, writers and educators rooted in Arabic heritage and open to the world.",
   "missionAr": "إعداد قرّاء وكتّاب ومربين واثقين، متجذرين في التراث العربي ومنفتحين على العالم.",
   "dean": "huda-salem"
  }
 ],
 "departments": [
  {
   "id": "dept-business-administration",
   "slug": "business-administration",
   "nameEn": "Business Administration",
   "nameAr": "إدارة الأعمال",
   "college": {
    "slug": "college-of-business",
    "nameEn": "College of Business",
    "nameAr": "كلية الأعمال"
   },
   "head": "layla-haddad",
   "imagePath": "/images/departments/business-administration.jpg",
   "focusEn": "management, strategy, marketing and business analytics",
   "focusAr": "الإدارة والاستراتيجية والتسويق وتحليلات الأعمال",
   "areasEn": [
    "Family business governance",
    "Digital transformation",
    "Entrepreneurship",
    "Business analytics"
   ],
   "areasAr": [
    "حوكمة الشركات العائلية",
    "التحول الرقمي",
    "ريادة الأعمال",
    "تحليلات الأعمال"
   ]
  },
  {
   "id": "dept-accounting-finance",
   "slug": "accounting-finance",
   "nameEn": "Accounting & Finance",
   "nameAr": "المحاسبة والتمويل",
   "college": {
    "slug": "college-of-business",
    "nameEn": "College of Business",
    "nameAr": "كلية الأعمال"
   },
   "head": "noura-saeed",
   "imagePath": "/images/departments/accounting-finance.jpg",
   "focusEn": "financial reporting, auditing, corporate finance and Islamic finance",
   "focusAr": "التقارير المالية والتدقيق وتمويل الشركات والتمويل الإسلامي",
   "areasEn": [
    "Financial reporting",
    "Islamic finance",
    "Audit and assurance",
    "Corporate finance"
   ],
   "areasAr": [
    "التقارير المالية",
    "التمويل الإسلامي",
    "التدقيق والتأكيد",
    "تمويل الشركات"
   ]
  },
  {
   "id": "dept-computer-science",
   "slug": "computer-science",
   "nameEn": "Computer Science",
   "nameAr": "علوم الحاسوب",
   "college": {
    "slug": "college-of-computing",
    "nameEn": "College of Computing & Technology",
    "nameAr": "كلية الحوسبة والتقنية"
   },
   "head": "karim-nasser",
   "imagePath": "/images/departments/computer-science.jpg",
   "focusEn": "programming, algorithms, data science and machine learning",
   "focusAr": "البرمجة والخوارزميات وعلم البيانات وتعلّم الآلة",
   "areasEn": [
    "Machine learning",
    "Arabic natural language processing",
    "Software engineering",
    "Learning analytics"
   ],
   "areasAr": [
    "تعلّم الآلة",
    "معالجة اللغة العربية الطبيعية",
    "هندسة البرمجيات",
    "تحليلات التعلّم"
   ]
  },
  {
   "id": "dept-arabic-language",
   "slug": "arabic-language",
   "nameEn": "Arabic Language & Literature",
   "nameAr": "اللغة العربية وآدابها",
   "college": {
    "slug": "college-of-humanities",
    "nameEn": "College of Humanities & Education",
    "nameAr": "كلية العلوم الإنسانية والتربية"
   },
   "head": "yousef-rahman",
   "imagePath": "/images/departments/arabic-language.jpg",
   "focusEn": "classical and modern Arabic literature, linguistics and translation",
   "focusAr": "الأدب العربي الكلاسيكي والحديث واللسانيات والترجمة",
   "areasEn": [
    "Classical Arabic prose",
    "Gulf literary heritage",
    "Arabic linguistics",
    "Translation studies"
   ],
   "areasAr": [
    "النثر العربي الكلاسيكي",
    "التراث الأدبي الخليجي",
    "اللسانيات العربية",
    "دراسات الترجمة"
   ]
  },
  {
   "id": "dept-education",
   "slug": "education",
   "nameEn": "Education",
   "nameAr": "التربية",
   "college": {
    "slug": "college-of-humanities",
    "nameEn": "College of Humanities & Education",
    "nameAr": "كلية العلوم الإنسانية والتربية"
   },
   "head": "huda-salem",
   "imagePath": "/images/departments/education.jpg",
   "focusEn": "curriculum design, assessment and educational leadership",
   "focusAr": "تصميم المناهج والتقييم والقيادة التربوية",
   "areasEn": [
    "Curriculum design",
    "Assessment for learning",
    "Educational leadership",
    "Digital pedagogy"
   ],
   "areasAr": [
    "تصميم المناهج",
    "التقييم من أجل التعلّم",
    "القيادة التربوية",
    "التربية الرقمية"
   ]
  }
 ],
 "programs": [
  {
   "id": "program-bsc-computer-science",
   "slug": "bsc-computer-science",
   "degreeLevel": "BACHELOR",
   "nameEn": "BSc in Computer Science",
   "nameAr": "بكالوريوس علوم الحاسوب",
   "summaryEn": "Programming, algorithms, data and intelligent systems, built up through four years of projects.",
   "summaryAr": "البرمجة والخوارزميات والبيانات والأنظمة الذكية عبر أربع سنوات من المشاريع.",
   "durationYears": "4",
   "totalCredits": 120,
   "category": "computer-science",
   "imagePath": "/images/programs/bsc-computer-science.jpg",
   "isFeatured": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Computer Science",
    "nameAr": "علوم الحاسوب",
    "college": {
     "slug": "college-of-computing",
     "nameEn": "College of Computing & Technology",
     "nameAr": "كلية الحوسبة والتقنية"
    }
   },
   "deptSlug": "computer-science",
   "curriculum": [
    [
     "CS101",
     1
    ],
    [
     "CS201",
     2
    ],
    [
     "DS210",
     2
    ],
    [
     "DS320",
     3
    ]
   ],
   "careersEn": [
    "Software developer",
    "Data analyst",
    "Machine learning engineer",
    "Systems analyst"
   ],
   "careersAr": [
    "مطوّر برمجيات",
    "محلل بيانات",
    "مهندس تعلّم آلة",
    "محلل أنظمة"
   ]
  },
  {
   "id": "program-msc-data-science",
   "slug": "msc-data-science",
   "degreeLevel": "MASTER",
   "nameEn": "MSc in Data Science",
   "nameAr": "ماجستير علم البيانات",
   "summaryEn": "Advanced statistics, machine learning and data engineering for working professionals.",
   "summaryAr": "الإحصاء المتقدم وتعلّم الآلة وهندسة البيانات للمهنيين.",
   "durationYears": "2",
   "totalCredits": 36,
   "category": "computer-science",
   "imagePath": "/images/programs/msc-data-science.jpg",
   "isFeatured": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Computer Science",
    "nameAr": "علوم الحاسوب",
    "college": {
     "slug": "college-of-computing",
     "nameEn": "College of Computing & Technology",
     "nameAr": "كلية الحوسبة والتقنية"
    }
   },
   "deptSlug": "computer-science",
   "curriculum": [
    [
     "DS210",
     1
    ],
    [
     "DS320",
     1
    ]
   ],
   "careersEn": [
    "Data scientist",
    "Analytics manager",
    "AI product specialist",
    "Research analyst"
   ],
   "careersAr": [
    "عالم بيانات",
    "مدير تحليلات",
    "أخصائي منتجات الذكاء الاصطناعي",
    "محلل أبحاث"
   ]
  },
  {
   "id": "program-bba",
   "slug": "bba",
   "degreeLevel": "BACHELOR",
   "nameEn": "Bachelor of Business Administration",
   "nameAr": "بكالوريوس إدارة الأعمال",
   "summaryEn": "A broad business foundation with specialist tracks in management, analytics and finance.",
   "summaryAr": "أساس واسع في الأعمال مع مسارات تخصصية في الإدارة والتحليلات والتمويل.",
   "durationYears": "4",
   "totalCredits": 120,
   "category": "business-administration",
   "imagePath": "/images/programs/bba.jpg",
   "isFeatured": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Business Administration",
    "nameAr": "إدارة الأعمال",
    "college": {
     "slug": "college-of-business",
     "nameEn": "College of Business",
     "nameAr": "كلية الأعمال"
    }
   },
   "deptSlug": "business-administration",
   "curriculum": [
    [
     "BA101",
     1
    ],
    [
     "AF110",
     1
    ],
    [
     "BA220",
     2
    ]
   ],
   "careersEn": [
    "Business analyst",
    "Project coordinator",
    "Marketing executive",
    "Entrepreneur"
   ],
   "careersAr": [
    "محلل أعمال",
    "منسق مشاريع",
    "تنفيذي تسويق",
    "رائد أعمال"
   ]
  },
  {
   "id": "program-mba",
   "slug": "mba",
   "degreeLevel": "MASTER",
   "nameEn": "Master of Business Administration",
   "nameAr": "ماجستير إدارة الأعمال",
   "summaryEn": "Strategic leadership for experienced professionals, with evening and weekend study.",
   "summaryAr": "قيادة استراتيجية للمهنيين ذوي الخبرة، مع دراسة مسائية وفي عطلة نهاية الأسبوع.",
   "durationYears": "2",
   "totalCredits": 42,
   "category": "business-administration",
   "imagePath": "/images/programs/mba.jpg",
   "isFeatured": false,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Business Administration",
    "nameAr": "إدارة الأعمال",
    "college": {
     "slug": "college-of-business",
     "nameEn": "College of Business",
     "nameAr": "كلية الأعمال"
    }
   },
   "deptSlug": "business-administration",
   "curriculum": [
    [
     "BA220",
     1
    ]
   ],
   "careersEn": [
    "Senior manager",
    "Strategy consultant",
    "Business unit head",
    "Founder"
   ],
   "careersAr": [
    "مدير أول",
    "مستشار استراتيجي",
    "رئيس وحدة أعمال",
    "مؤسس شركة"
   ]
  },
  {
   "id": "program-ba-arabic",
   "slug": "ba-arabic",
   "degreeLevel": "BACHELOR",
   "nameEn": "BA in Arabic Language & Literature",
   "nameAr": "بكالوريوس اللغة العربية وآدابها",
   "summaryEn": "Language, literature and translation, from classical texts to contemporary Gulf writing.",
   "summaryAr": "اللغة والأدب والترجمة، من النصوص الكلاسيكية إلى الكتابة الخليجية المعاصرة.",
   "durationYears": "4",
   "totalCredits": 120,
   "category": "arabic-language",
   "imagePath": "/images/programs/ba-arabic.jpg",
   "isFeatured": false,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Arabic Language & Literature",
    "nameAr": "اللغة العربية وآدابها",
    "college": {
     "slug": "college-of-humanities",
     "nameEn": "College of Humanities & Education",
     "nameAr": "كلية العلوم الإنسانية والتربية"
    }
   },
   "deptSlug": "arabic-language",
   "curriculum": [
    [
     "AR101",
     1
    ]
   ],
   "careersEn": [
    "Arabic teacher",
    "Translator",
    "Editor and writer",
    "Cultural heritage specialist"
   ],
   "careersAr": [
    "معلم لغة عربية",
    "مترجم",
    "محرر وكاتب",
    "أخصائي تراث ثقافي"
   ]
  },
  {
   "id": "program-diploma-teaching",
   "slug": "diploma-teaching",
   "degreeLevel": "DIPLOMA",
   "nameEn": "Professional Diploma in Teaching",
   "nameAr": "الدبلوم المهني في التدريس",
   "summaryEn": "A one-year practical route into teaching, with supervised classroom placements.",
   "summaryAr": "مسار عملي لمدة عام واحد إلى مهنة التدريس، مع تدريب صفي تحت الإشراف.",
   "durationYears": "1",
   "totalCredits": 24,
   "category": "education",
   "imagePath": "/images/programs/diploma-teaching.jpg",
   "isFeatured": false,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "department": {
    "nameEn": "Education",
    "nameAr": "التربية",
    "college": {
     "slug": "college-of-humanities",
     "nameEn": "College of Humanities & Education",
     "nameAr": "كلية العلوم الإنسانية والتربية"
    }
   },
   "deptSlug": "education",
   "curriculum": [
    [
     "ED201",
     1
    ]
   ],
   "careersEn": [
    "School teacher",
    "Curriculum coordinator",
    "Learning designer",
    "Education officer"
   ],
   "careersAr": [
    "معلم مدرسة",
    "منسق مناهج",
    "مصمم تعلّم",
    "مسؤول تربوي"
   ]
  }
 ],
 "courses": [
  {
   "id": "course-cs101",
   "slug": "cs101",
   "code": "CS101",
   "titleEn": "Introduction to Programming",
   "titleAr": "مقدمة في البرمجة",
   "descriptionEn": "Learn to think like a programmer. Starting from zero, you write real Python programs, work with data, and build a small project you can show to others.",
   "descriptionAr": "تعلّم التفكير كمبرمج. تبدأ من الصفر وتكتب برامج حقيقية بلغة بايثون، وتتعامل مع البيانات، وتبني مشروعاً صغيراً يمكنك عرضه.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/cs101.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "computer-science",
   "instr": "maryam-khalil",
   "featured": true,
   "prereq": null,
   "priceFils": 45000,
   "live": false,
   "outcomesEn": [
    "Write and debug Python programs",
    "Use variables, loops, functions and lists confidently",
    "Read and write data files",
    "Break a problem into small, testable steps"
   ],
   "outcomesAr": [
    "كتابة برامج بايثون وتصحيح أخطائها",
    "استخدام المتغيرات والحلقات والدوال والقوائم بثقة",
    "قراءة ملفات البيانات وكتابتها",
    "تقسيم المشكلة إلى خطوات صغيرة قابلة للاختبار"
   ],
   "syllabus": [
    {
     "module": "Module 1: Getting started",
     "moduleAr": "الوحدة 1: البداية",
     "topicsEn": [
      "Setting up Python",
      "Variables and types",
      "Input and output"
     ],
     "topicsAr": [
      "تجهيز بايثون",
      "المتغيرات والأنواع",
      "الإدخال والإخراج"
     ]
    },
    {
     "module": "Module 2: Control flow",
     "moduleAr": "الوحدة 2: التحكم في التدفق",
     "topicsEn": [
      "Conditions",
      "Loops",
      "Functions"
     ],
     "topicsAr": [
      "الشروط",
      "الحلقات",
      "الدوال"
     ]
    },
    {
     "module": "Module 3: Working with data",
     "moduleAr": "الوحدة 3: التعامل مع البيانات",
     "topicsEn": [
      "Lists and dictionaries",
      "Files",
      "Mini project"
     ],
     "topicsAr": [
      "القوائم والقواميس",
      "الملفات",
      "مشروع مصغّر"
     ]
    }
   ]
  },
  {
   "id": "course-cs201",
   "slug": "cs201",
   "code": "CS201",
   "titleEn": "Data Structures & Algorithms",
   "titleAr": "هياكل البيانات والخوارزميات",
   "descriptionEn": "Choose the right structure for the job and reason about how fast your code really is. Covers arrays, linked lists, trees, graphs, sorting and searching.",
   "descriptionAr": "اختر البنية المناسبة لكل مهمة وقدّر سرعة شيفرتك فعلياً. يغطي المصفوفات والقوائم المترابطة والأشجار والرسوم البيانية وخوارزميات الترتيب والبحث.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/cs201.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "computer-science",
   "instr": "maryam-khalil",
   "featured": false,
   "prereq": "CS101",
   "priceFils": 60000,
   "live": false,
   "outcomesEn": [
    "Analyse running time with Big-O notation",
    "Implement lists, stacks, queues, trees and graphs",
    "Apply classic sorting and searching algorithms",
    "Pick an appropriate data structure for a given problem"
   ],
   "outcomesAr": [
    "تحليل زمن التنفيذ باستخدام ترميز O الكبير",
    "تنفيذ القوائم والمكدسات والطوابير والأشجار والرسوم البيانية",
    "تطبيق خوارزميات الترتيب والبحث الكلاسيكية",
    "اختيار بنية البيانات المناسبة لكل مشكلة"
   ],
   "syllabus": [
    {
     "module": "Module 1: Foundations",
     "moduleAr": "الوحدة 1: الأسس",
     "topicsEn": [
      "Complexity",
      "Arrays and lists",
      "Stacks and queues"
     ],
     "topicsAr": [
      "التعقيد",
      "المصفوفات والقوائم",
      "المكدسات والطوابير"
     ]
    },
    {
     "module": "Module 2: Trees and graphs",
     "moduleAr": "الوحدة 2: الأشجار والرسوم البيانية",
     "topicsEn": [
      "Binary search trees",
      "Heaps",
      "Graph traversal"
     ],
     "topicsAr": [
      "أشجار البحث الثنائية",
      "الأكوام",
      "اجتياز الرسوم البيانية"
     ]
    },
    {
     "module": "Module 3: Algorithms",
     "moduleAr": "الوحدة 3: الخوارزميات",
     "topicsEn": [
      "Sorting",
      "Searching",
      "Dynamic programming"
     ],
     "topicsAr": [
      "الترتيب",
      "البحث",
      "البرمجة الديناميكية"
     ]
    }
   ]
  },
  {
   "id": "course-ds210",
   "slug": "ds210",
   "code": "DS210",
   "titleEn": "Foundations of Data Science",
   "titleAr": "أسس علم البيانات",
   "descriptionEn": "A live, instructor-led course. Clean, explore and visualise real datasets, then tell a clear story with the results. Classes run online with recordings, notes and quizzes after each session.",
   "descriptionAr": "مقرر مباشر بإشراف المحاضر. نظّف مجموعات بيانات حقيقية واستكشفها ومثّلها بصرياً، ثم اعرض النتائج بقصة واضحة. تُعقد الحصص عبر الإنترنت مع تسجيلات وملاحظات واختبارات قصيرة بعد كل حصة.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ds210.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "computer-science",
   "instr": "karim-nasser",
   "featured": true,
   "prereq": "CS101",
   "priceFils": 75000,
   "live": true,
   "outcomesEn": [
    "Load, clean and reshape tabular data",
    "Summarise data with descriptive statistics",
    "Build clear, honest charts",
    "Communicate findings to non-specialists"
   ],
   "outcomesAr": [
    "تحميل البيانات الجدولية وتنظيفها وإعادة تشكيلها",
    "تلخيص البيانات بالإحصاء الوصفي",
    "إنشاء رسوم بيانية واضحة وأمينة",
    "عرض النتائج لغير المتخصصين"
   ],
   "syllabus": [
    {
     "module": "Module 1: Data basics",
     "moduleAr": "الوحدة 1: أساسيات البيانات",
     "topicsEn": [
      "Tabular data",
      "Cleaning",
      "Joining datasets"
     ],
     "topicsAr": [
      "البيانات الجدولية",
      "التنظيف",
      "دمج مجموعات البيانات"
     ]
    },
    {
     "module": "Module 2: Exploration",
     "moduleAr": "الوحدة 2: الاستكشاف",
     "topicsEn": [
      "Descriptive statistics",
      "Distributions",
      "Correlation"
     ],
     "topicsAr": [
      "الإحصاء الوصفي",
      "التوزيعات",
      "الارتباط"
     ]
    },
    {
     "module": "Module 3: Visual storytelling",
     "moduleAr": "الوحدة 3: السرد البصري",
     "topicsEn": [
      "Choosing a chart",
      "Dashboards",
      "Presenting results"
     ],
     "topicsAr": [
      "اختيار الرسم البياني",
      "لوحات المعلومات",
      "عرض النتائج"
     ]
    }
   ]
  },
  {
   "id": "course-ds320",
   "slug": "ds320",
   "code": "DS320",
   "titleEn": "Machine Learning",
   "titleAr": "تعلّم الآلة",
   "descriptionEn": "Train models that learn from data. You build regression and classification models, evaluate them properly, and discuss when automated decisions are and are not appropriate.",
   "descriptionAr": "درّب نماذج تتعلم من البيانات. تبني نماذج الانحدار والتصنيف وتقيّمها بالشكل الصحيح، وتناقش متى تكون القرارات الآلية مناسبة ومتى لا تكون.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ds320.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "computer-science",
   "instr": "karim-nasser",
   "featured": false,
   "prereq": "DS210",
   "priceFils": 90000,
   "live": false,
   "outcomesEn": [
    "Explain supervised and unsupervised learning",
    "Train and tune regression and classification models",
    "Evaluate models with appropriate metrics",
    "Identify bias and risk in automated decisions"
   ],
   "outcomesAr": [
    "شرح التعلم الموجّه وغير الموجّه",
    "تدريب نماذج الانحدار والتصنيف وضبطها",
    "تقييم النماذج بالمقاييس المناسبة",
    "تحديد التحيز والمخاطر في القرارات الآلية"
   ],
   "syllabus": [
    {
     "module": "Module 1: Learning from data",
     "moduleAr": "الوحدة 1: التعلم من البيانات",
     "topicsEn": [
      "Regression",
      "Classification",
      "Overfitting"
     ],
     "topicsAr": [
      "الانحدار",
      "التصنيف",
      "الإفراط في الملاءمة"
     ]
    },
    {
     "module": "Module 2: Models",
     "moduleAr": "الوحدة 2: النماذج",
     "topicsEn": [
      "Decision trees",
      "Ensembles",
      "Neural networks"
     ],
     "topicsAr": [
      "أشجار القرار",
      "النماذج التجميعية",
      "الشبكات العصبية"
     ]
    },
    {
     "module": "Module 3: Responsible ML",
     "moduleAr": "الوحدة 3: تعلّم الآلة المسؤول",
     "topicsEn": [
      "Evaluation",
      "Fairness",
      "Deployment"
     ],
     "topicsAr": [
      "التقييم",
      "العدالة",
      "النشر"
     ]
    }
   ]
  },
  {
   "id": "course-ba101",
   "slug": "ba101",
   "code": "BA101",
   "titleEn": "Principles of Management",
   "titleAr": "مبادئ الإدارة",
   "descriptionEn": "How organisations plan, organise, lead and control. Through regional case studies you see how managers make decisions in family firms, start-ups and large enterprises.",
   "descriptionAr": "كيف تخطط المؤسسات وتنظّم وتقود وتراقب. من خلال دراسات حالة إقليمية ترى كيف يتخذ المديرون قراراتهم في الشركات العائلية والناشئة والمؤسسات الكبيرة.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ba101.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "business-administration",
   "instr": "omar-farouk",
   "featured": true,
   "prereq": null,
   "priceFils": 40000,
   "live": false,
   "outcomesEn": [
    "Describe the core functions of management",
    "Analyse an organisation's structure and culture",
    "Apply basic planning and decision tools",
    "Reflect on ethical leadership"
   ],
   "outcomesAr": [
    "وصف الوظائف الأساسية للإدارة",
    "تحليل هيكل المؤسسة وثقافتها",
    "تطبيق أدوات التخطيط واتخاذ القرار الأساسية",
    "التأمل في القيادة الأخلاقية"
   ],
   "syllabus": [
    {
     "module": "Module 1: Planning",
     "moduleAr": "الوحدة 1: التخطيط",
     "topicsEn": [
      "Goals and strategy",
      "Decision making",
      "Environment analysis"
     ],
     "topicsAr": [
      "الأهداف والاستراتيجية",
      "اتخاذ القرار",
      "تحليل البيئة"
     ]
    },
    {
     "module": "Module 2: Organising and leading",
     "moduleAr": "الوحدة 2: التنظيم والقيادة",
     "topicsEn": [
      "Structure",
      "Motivation",
      "Teams"
     ],
     "topicsAr": [
      "الهيكل",
      "التحفيز",
      "الفرق"
     ]
    },
    {
     "module": "Module 3: Control",
     "moduleAr": "الوحدة 3: الرقابة",
     "topicsEn": [
      "Performance measures",
      "Quality",
      "Case study"
     ],
     "topicsAr": [
      "مقاييس الأداء",
      "الجودة",
      "دراسة حالة"
     ]
    }
   ]
  },
  {
   "id": "course-ba220",
   "slug": "ba220",
   "code": "BA220",
   "titleEn": "Business Analytics",
   "titleAr": "تحليلات الأعمال",
   "descriptionEn": "Turn business data into decisions. Using spreadsheets and visual tools, you analyse sales, customers and operations, and present recommendations managers can act on.",
   "descriptionAr": "حوّل بيانات الأعمال إلى قرارات. باستخدام جداول البيانات وأدوات التصوير البصري تحلل المبيعات والعملاء والعمليات، وتقدّم توصيات قابلة للتنفيذ.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ba220.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "business-administration",
   "instr": "layla-haddad",
   "featured": true,
   "prereq": "BA101",
   "priceFils": 65000,
   "live": false,
   "outcomesEn": [
    "Frame business questions as analysis tasks",
    "Build pivot tables, forecasts and dashboards",
    "Interpret key performance indicators",
    "Present data-driven recommendations"
   ],
   "outcomesAr": [
    "صياغة أسئلة الأعمال كمهام تحليلية",
    "بناء الجداول المحورية والتوقعات ولوحات المعلومات",
    "تفسير مؤشرات الأداء الرئيسية",
    "تقديم توصيات مبنية على البيانات"
   ],
   "syllabus": [
    {
     "module": "Module 1: Descriptive analytics",
     "moduleAr": "الوحدة 1: التحليلات الوصفية",
     "topicsEn": [
      "KPIs",
      "Pivot tables",
      "Dashboards"
     ],
     "topicsAr": [
      "مؤشرات الأداء",
      "الجداول المحورية",
      "لوحات المعلومات"
     ]
    },
    {
     "module": "Module 2: Predictive analytics",
     "moduleAr": "الوحدة 2: التحليلات التنبؤية",
     "topicsEn": [
      "Trends",
      "Forecasting",
      "Regression"
     ],
     "topicsAr": [
      "الاتجاهات",
      "التنبؤ",
      "الانحدار"
     ]
    },
    {
     "module": "Module 3: Decisions",
     "moduleAr": "الوحدة 3: القرارات",
     "topicsEn": [
      "Scenario analysis",
      "Storytelling",
      "Capstone"
     ],
     "topicsAr": [
      "تحليل السيناريوهات",
      "السرد بالبيانات",
      "مشروع ختامي"
     ]
    }
   ]
  },
  {
   "id": "course-af110",
   "slug": "af110",
   "code": "AF110",
   "titleEn": "Financial Accounting",
   "titleAr": "المحاسبة المالية",
   "descriptionEn": "Read and prepare the statements every business relies on. Record transactions, build a balance sheet and income statement, and interpret what they reveal.",
   "descriptionAr": "اقرأ القوائم التي تعتمد عليها كل منشأة وأعدّها. سجّل المعاملات، وأعدّ الميزانية العمومية وقائمة الدخل، وفسّر ما تكشفه.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/af110.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "accounting-finance",
   "instr": "noura-saeed",
   "featured": false,
   "prereq": null,
   "priceFils": 50000,
   "live": false,
   "outcomesEn": [
    "Apply double-entry bookkeeping",
    "Prepare the main financial statements",
    "Explain key accounting principles",
    "Calculate and interpret basic ratios"
   ],
   "outcomesAr": [
    "تطبيق القيد المزدوج",
    "إعداد القوائم المالية الرئيسية",
    "شرح المبادئ المحاسبية الأساسية",
    "حساب النسب المالية الأساسية وتفسيرها"
   ],
   "syllabus": [
    {
     "module": "Module 1: Recording",
     "moduleAr": "الوحدة 1: التسجيل",
     "topicsEn": [
      "The accounting equation",
      "Journals",
      "Ledgers"
     ],
     "topicsAr": [
      "المعادلة المحاسبية",
      "اليومية",
      "دفتر الأستاذ"
     ]
    },
    {
     "module": "Module 2: Statements",
     "moduleAr": "الوحدة 2: القوائم",
     "topicsEn": [
      "Trial balance",
      "Income statement",
      "Balance sheet"
     ],
     "topicsAr": [
      "ميزان المراجعة",
      "قائمة الدخل",
      "الميزانية العمومية"
     ]
    },
    {
     "module": "Module 3: Analysis",
     "moduleAr": "الوحدة 3: التحليل",
     "topicsEn": [
      "Cash flow",
      "Ratios",
      "Reporting standards"
     ],
     "topicsAr": [
      "التدفقات النقدية",
      "النسب",
      "معايير التقارير"
     ]
    }
   ]
  },
  {
   "id": "course-ar101",
   "slug": "ar101",
   "code": "AR101",
   "titleEn": "Classical Arabic Texts",
   "titleAr": "نصوص عربية كلاسيكية",
   "descriptionEn": "A guided reading of landmark Arabic prose and poetry, from the pre-Islamic odes to the great essayists. Free and open to everyone.",
   "descriptionAr": "قراءة موجّهة لأبرز النصوص النثرية والشعرية العربية، من المعلقات إلى كبار الكتّاب. مجاني ومتاح للجميع.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ar101.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "arabic-language",
   "instr": "yousef-rahman",
   "featured": false,
   "prereq": null,
   "priceFils": 0,
   "live": false,
   "outcomesEn": [
    "Read classical texts with growing independence",
    "Recognise major genres and periods",
    "Discuss style, rhetoric and meaning",
    "Write a short analytical commentary"
   ],
   "outcomesAr": [
    "قراءة النصوص الكلاسيكية باستقلالية متزايدة",
    "التعرف على الأجناس والعصور الأدبية الكبرى",
    "مناقشة الأسلوب والبلاغة والمعنى",
    "كتابة تعليق تحليلي قصير"
   ],
   "syllabus": [
    {
     "module": "Module 1: Poetry",
     "moduleAr": "الوحدة 1: الشعر",
     "topicsEn": [
      "The Mu'allaqat",
      "Abbasid poetry",
      "Metre and rhyme"
     ],
     "topicsAr": [
      "المعلقات",
      "الشعر العباسي",
      "الوزن والقافية"
     ]
    },
    {
     "module": "Module 2: Prose",
     "moduleAr": "الوحدة 2: النثر",
     "topicsEn": [
      "Al-Jahiz",
      "Maqamat",
      "Letters"
     ],
     "topicsAr": [
      "الجاحظ",
      "المقامات",
      "الرسائل"
     ]
    },
    {
     "module": "Module 3: Reading closely",
     "moduleAr": "الوحدة 3: القراءة المتأنية",
     "topicsEn": [
      "Rhetoric",
      "Commentary",
      "Final essay"
     ],
     "topicsAr": [
      "البلاغة",
      "التعليق",
      "المقال الختامي"
     ]
    }
   ]
  },
  {
   "id": "course-ed201",
   "slug": "ed201",
   "code": "ED201",
   "titleEn": "Curriculum Design",
   "titleAr": "تصميم المناهج",
   "descriptionEn": "Plan units and lessons that start from clear goals. You design a complete unit with aligned activities and assessment, and receive feedback from peers and tutors.",
   "descriptionAr": "خطّط وحدات ودروساً تنطلق من أهداف واضحة. تصمم وحدة كاملة بأنشطة وتقييم متوائمين، وتتلقى ملاحظات من الزملاء والمحاضرين.",
   "creditHours": 3,
   "courseType": "Core",
   "imagePath": "/images/courses/ed201.jpg",
   "onlineEnabled": true,
   "confirmation": "CLIENT_CONFIRMATION_REQUIRED",
   "dept": "education",
   "instr": "huda-salem",
   "featured": false,
   "prereq": null,
   "priceFils": 35000,
   "live": false,
   "outcomesEn": [
    "Write clear, measurable learning outcomes",
    "Design units using backward design",
    "Align activities with assessment",
    "Adapt plans for diverse learners"
   ],
   "outcomesAr": [
    "صياغة مخرجات تعلم واضحة وقابلة للقياس",
    "تصميم الوحدات بأسلوب التصميم العكسي",
    "مواءمة الأنشطة مع التقييم",
    "تكييف الخطط لمتعلمين متنوعين"
   ],
   "syllabus": [
    {
     "module": "Module 1: Purpose",
     "moduleAr": "الوحدة 1: الغاية",
     "topicsEn": [
      "Learning outcomes",
      "Standards",
      "Learner needs"
     ],
     "topicsAr": [
      "مخرجات التعلم",
      "المعايير",
      "احتياجات المتعلمين"
     ]
    },
    {
     "module": "Module 2: Design",
     "moduleAr": "الوحدة 2: التصميم",
     "topicsEn": [
      "Backward design",
      "Activities",
      "Resources"
     ],
     "topicsAr": [
      "التصميم العكسي",
      "الأنشطة",
      "المصادر"
     ]
    },
    {
     "module": "Module 3: Assessment",
     "moduleAr": "الوحدة 3: التقييم",
     "topicsEn": [
      "Formative assessment",
      "Rubrics",
      "Unit review"
     ],
     "topicsAr": [
      "التقييم التكويني",
      "سلالم التقدير",
      "مراجعة الوحدة"
     ]
    }
   ]
  }
 ],
 "faculty": [
  {
   "id": "faculty-layla-haddad",
   "slug": "layla-haddad",
   "fullNameEn": "Dr. Layla Haddad",
   "fullNameAr": "د. ليلى حداد",
   "titleEn": "Associate Professor",
   "titleAr": "أستاذ مشارك",
   "photoPath": null,
   "specializationEn": "Business Analytics",
   "specializationAr": "تحليلات الأعمال",
   "email": null,
   "departments": [
    {
     "slug": "business-administration",
     "nameEn": "Business Administration",
     "nameAr": "إدارة الأعمال"
    }
   ]
  },
  {
   "id": "faculty-omar-farouk",
   "slug": "omar-farouk",
   "fullNameEn": "Prof. Omar Farouk",
   "fullNameAr": "أ. د. عمر فاروق",
   "titleEn": "Professor",
   "titleAr": "أستاذ",
   "photoPath": null,
   "specializationEn": "Strategic Management",
   "specializationAr": "الإدارة الاستراتيجية",
   "email": null,
   "departments": [
    {
     "slug": "business-administration",
     "nameEn": "Business Administration",
     "nameAr": "إدارة الأعمال"
    }
   ]
  },
  {
   "id": "faculty-noura-saeed",
   "slug": "noura-saeed",
   "fullNameEn": "Dr. Noura Saeed",
   "fullNameAr": "د. نورة سعيد",
   "titleEn": "Assistant Professor",
   "titleAr": "أستاذ مساعد",
   "photoPath": null,
   "specializationEn": "Accounting & Finance",
   "specializationAr": "المحاسبة والتمويل",
   "email": null,
   "departments": [
    {
     "slug": "accounting-finance",
     "nameEn": "Accounting & Finance",
     "nameAr": "المحاسبة والتمويل"
    }
   ]
  },
  {
   "id": "faculty-karim-nasser",
   "slug": "karim-nasser",
   "fullNameEn": "Dr. Karim Nasser",
   "fullNameAr": "د. كريم ناصر",
   "titleEn": "Associate Professor",
   "titleAr": "أستاذ مشارك",
   "photoPath": null,
   "specializationEn": "Data Science",
   "specializationAr": "علم البيانات",
   "email": null,
   "departments": [
    {
     "slug": "computer-science",
     "nameEn": "Computer Science",
     "nameAr": "علوم الحاسوب"
    }
   ]
  },
  {
   "id": "faculty-maryam-khalil",
   "slug": "maryam-khalil",
   "fullNameEn": "Dr. Maryam Khalil",
   "fullNameAr": "د. مريم خليل",
   "titleEn": "Professor",
   "titleAr": "أستاذ",
   "photoPath": null,
   "specializationEn": "Software Engineering",
   "specializationAr": "هندسة البرمجيات",
   "email": null,
   "departments": [
    {
     "slug": "computer-science",
     "nameEn": "Computer Science",
     "nameAr": "علوم الحاسوب"
    }
   ]
  },
  {
   "id": "faculty-yousef-rahman",
   "slug": "yousef-rahman",
   "fullNameEn": "Dr. Yousef Rahman",
   "fullNameAr": "د. يوسف رحمن",
   "titleEn": "Assistant Professor",
   "titleAr": "أستاذ مساعد",
   "photoPath": null,
   "specializationEn": "Arabic Literature",
   "specializationAr": "الأدب العربي",
   "email": null,
   "departments": [
    {
     "slug": "arabic-language",
     "nameEn": "Arabic Language & Literature",
     "nameAr": "اللغة العربية وآدابها"
    }
   ]
  },
  {
   "id": "faculty-huda-salem",
   "slug": "huda-salem",
   "fullNameEn": "Dr. Huda Salem",
   "fullNameAr": "د. هدى سالم",
   "titleEn": "Associate Professor",
   "titleAr": "أستاذ مشارك",
   "photoPath": null,
   "specializationEn": "Educational Leadership",
   "specializationAr": "القيادة التربوية",
   "email": null,
   "departments": [
    {
     "slug": "education",
     "nameEn": "Education",
     "nameAr": "التربية"
    }
   ]
  }
 ],
 "news": [
  {
   "id": "news-library-reading-week",
   "slug": "library-reading-week",
   "category": "student-life",
   "titleEn": "Reading week brings students back to the library",
   "titleAr": "أسبوع القراءة يعيد الطلبة إلى المكتبة",
   "excerptEn": "A week of reading circles, author talks and quiet study sessions celebrated the joy of books.",
   "excerptAr": "أسبوع من حلقات القراءة ولقاءات الكتّاب وجلسات الدراسة الهادئة احتفاءً بمتعة الكتب.",
   "imagePath": "/images/news/library-week.jpg",
   "isFeatured": true,
   "isAnnouncement": false,
   "daysAgo": 3
  },
  {
   "id": "news-research-seminar-series",
   "slug": "research-seminar-series",
   "category": "research",
   "titleEn": "New research seminar series announced",
   "titleAr": "الإعلان عن سلسلة ندوات بحثية جديدة",
   "excerptEn": "Monthly seminars will bring faculty, students and guest speakers together to share work in progress.",
   "excerptAr": "ستجمع الندوات الشهرية أعضاء هيئة التدريس والطلبة والمتحدثين الضيوف لعرض أعمالهم البحثية الجارية.",
   "imagePath": "/images/news/research-seminar.jpg",
   "isFeatured": false,
   "isAnnouncement": false,
   "daysAgo": 10
  },
  {
   "id": "news-new-student-orientation",
   "slug": "new-student-orientation",
   "category": "academic",
   "titleEn": "Orientation programme welcomes new students",
   "titleAr": "البرنامج التعريفي يرحّب بالطلبة الجدد",
   "excerptEn": "New students met their advisers, toured the facilities and set up their online learning accounts.",
   "excerptAr": "التقى الطلبة الجدد بمرشديهم الأكاديميين، وتجوّلوا في المرافق، وفعّلوا حساباتهم في منصة التعلّم الإلكتروني.",
   "imagePath": "/images/news/orientation.jpg",
   "isFeatured": false,
   "isAnnouncement": false,
   "daysAgo": 18
  },
  {
   "id": "news-online-courses-open",
   "slug": "online-courses-open",
   "category": "announcement",
   "titleEn": "Online courses are now open for enrolment",
   "titleAr": "باب التسجيل في المقررات الإلكترونية مفتوح الآن",
   "excerptEn": "Create an account, choose a course and start learning today, with recorded lessons, live classes, notes and quizzes.",
   "excerptAr": "أنشئ حساباً واختر مقرراً وابدأ التعلّم اليوم، مع دروس مسجلة وحصص مباشرة وملاحظات واختبارات قصيرة.",
   "imagePath": "/images/news/admissions-enquiries.jpg",
   "isFeatured": false,
   "isAnnouncement": true,
   "daysAgo": 1
  }
 ],
 "events": [
  {
   "id": "event-open-day",
   "slug": "open-day",
   "category": "academic",
   "titleEn": "Open day",
   "titleAr": "اليوم المفتوح",
   "summaryEn": "Meet faculty, explore programmes and get your questions about online study answered.",
   "summaryAr": "التقِ بأعضاء هيئة التدريس، واستكشف البرامج، واحصل على إجابات أسئلتك حول الدراسة الإلكترونية.",
   "imagePath": "/images/events/open-day.jpg",
   "isFeatured": true,
   "inDays": 5,
   "venueEn": null,
   "venueAr": null
  },
  {
   "id": "event-talk-education-in-dubai",
   "slug": "talk-education-in-dubai",
   "category": "cultural",
   "titleEn": "Talk: A century of education in Dubai",
   "titleAr": "محاضرة: قرن من التعليم في دبي",
   "summaryEn": "From the first classes at Al Ahmadiya in 1912 to today: how learning has shaped the city.",
   "summaryAr": "من الصفوف الأولى في الأحمدية عام 1912 حتى اليوم: كيف شكّل التعليم المدينة.",
   "imagePath": "/images/events/heritage-talk.jpg",
   "isFeatured": false,
   "inDays": 12,
   "venueEn": null,
   "venueAr": null
  },
  {
   "id": "event-academic-writing-workshop",
   "slug": "academic-writing-workshop",
   "category": "workshop",
   "titleEn": "Academic writing workshop",
   "titleAr": "ورشة الكتابة الأكاديمية",
   "summaryEn": "A hands-on session on structuring essays, citing sources and giving feedback to peers.",
   "summaryAr": "جلسة تطبيقية حول بناء المقالات وتوثيق المصادر وتقديم الملاحظات للزملاء.",
   "imagePath": "/images/events/writing-workshop.jpg",
   "isFeatured": false,
   "inDays": 20,
   "venueEn": null,
   "venueAr": null
  },
  {
   "id": "event-research-symposium",
   "slug": "research-symposium",
   "category": "research",
   "titleEn": "Research symposium",
   "titleAr": "الندوة البحثية",
   "summaryEn": "Faculty and graduate students presented current research across all three colleges.",
   "summaryAr": "عرض أعضاء هيئة التدريس وطلبة الدراسات العليا أبحاثهم الحالية في الكليات الثلاث.",
   "imagePath": "/images/events/research-symposium.jpg",
   "isFeatured": false,
   "inDays": -14,
   "venueEn": null,
   "venueAr": null
  },
  {
   "id": "event-sports-day",
   "slug": "sports-day",
   "category": "sports",
   "titleEn": "Sports day",
   "titleAr": "اليوم الرياضي",
   "summaryEn": "A day of friendly competition, team games and fitness challenges.",
   "summaryAr": "يوم من المنافسات الودية والألعاب الجماعية وتحديات اللياقة.",
   "imagePath": "/images/events/sports-day.jpg",
   "isFeatured": false,
   "inDays": -30,
   "venueEn": null,
   "venueAr": null
  }
 ],
 "faqs": [
  {
   "id": "faq-1",
   "scope": "programs",
   "questionEn": "How long are the programmes?",
   "questionAr": "ما مدة البرامج؟",
   "answerEn": "Bachelor's programmes take four years, master's programmes two years and the professional diploma one year of full-time study. Each programme page shows its duration and credits.",
   "answerAr": "تستغرق برامج البكالوريوس أربع سنوات، والماجستير سنتين، والدبلوم المهني سنة واحدة بدوام كامل. وتوضح صفحة كل برنامج مدته وساعاته المعتمدة."
  },
  {
   "id": "faq-2",
   "scope": "programs",
   "questionEn": "Can I take a single course online without joining a programme?",
   "questionAr": "هل يمكنني دراسة مقرر واحد عبر الإنترنت دون الالتحاق ببرنامج؟",
   "answerEn": "Yes. Open any course page, create an account and enrol. Free courses start immediately; paid courses start as soon as payment is confirmed.",
   "answerAr": "نعم. افتح صفحة أي مقرر، وأنشئ حساباً، ثم سجّل. تبدأ المقررات المجانية فوراً، وتبدأ المقررات المدفوعة فور تأكيد الدفع."
  },
  {
   "id": "faq-3",
   "scope": "admissions",
   "questionEn": "How do I apply?",
   "questionAr": "كيف أقدّم طلبي؟",
   "answerEn": "Use the eligibility checker to see which programmes match your qualifications, then create an account and complete the online application. The application fee is paid at the last step.",
   "answerAr": "استخدم أداة التحقق من الأهلية لمعرفة البرامج المناسبة لمؤهلاتك، ثم أنشئ حساباً وأكمل الطلب الإلكتروني. تُدفع رسوم الطلب في الخطوة الأخيرة."
  }
 ],
 "tour": [
  {
   "id": "tour-academic",
   "slug": "academic",
   "kind": "academic",
   "titleEn": "Academic blocks",
   "titleAr": "المباني الأكاديمية",
   "descriptionEn": "Lecture theatres, seminar rooms and faculty offices.",
   "descriptionAr": "قاعات المحاضرات وغرف الندوات ومكاتب أعضاء هيئة التدريس.",
   "imagePath": "/images/campus/academic.jpg",
   "panoramaUrl": null,
   "isHeritage": false
  },
  {
   "id": "tour-library",
   "slug": "library",
   "kind": "library",
   "titleEn": "Library",
   "titleAr": "المكتبة",
   "descriptionEn": "Quiet study floors, group rooms and digital collections.",
   "descriptionAr": "طوابق للدراسة الهادئة وغرف للعمل الجماعي ومجموعات رقمية.",
   "imagePath": "/images/campus/library.jpg",
   "panoramaUrl": null,
   "isHeritage": false
  },
  {
   "id": "tour-research",
   "slug": "research",
   "kind": "research",
   "titleEn": "Research centre",
   "titleAr": "مركز الأبحاث",
   "descriptionEn": "Computer labs and project studios for teaching and research.",
   "descriptionAr": "مختبرات حاسوب واستوديوهات مشاريع للتدريس والبحث.",
   "imagePath": "/images/campus/research.jpg",
   "panoramaUrl": null,
   "isHeritage": false
  },
  {
   "id": "tour-sports",
   "slug": "sports",
   "kind": "sports",
   "titleEn": "Sports complex",
   "titleAr": "المجمع الرياضي",
   "descriptionEn": "Indoor courts and fitness facilities for students and staff.",
   "descriptionAr": "ملاعب داخلية ومرافق لياقة للطلبة والموظفين.",
   "imagePath": "/images/campus/sports.jpg",
   "panoramaUrl": null,
   "isHeritage": false
  },
  {
   "id": "tour-student-life",
   "slug": "student-life",
   "kind": "student-life",
   "titleEn": "Student life",
   "titleAr": "الحياة الطلابية",
   "descriptionEn": "Green spaces, clubs and places to meet between classes.",
   "descriptionAr": "مساحات خضراء وأندية وأماكن للقاء بين المحاضرات.",
   "imagePath": "/images/campus/student-life.jpg",
   "panoramaUrl": null,
   "isHeritage": false
  }
 ]
} as const;
