'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { LearnCourse } from '@/components/account/LearnCourse';

export default function PortalCourse() {
  const { slug } = useParams<{ slug: string }>();
  const sp = useSearchParams();
  return <LearnCourse slug={slug} initialLesson={sp.get('lesson') ?? undefined} initialTab={(sp.get('tab') as 'quizzes' | 'notes' | null) ?? undefined} />;
}
