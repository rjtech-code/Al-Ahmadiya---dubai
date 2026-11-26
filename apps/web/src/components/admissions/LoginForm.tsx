'use client';

import { CheckCircle2, GraduationCap } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { saveDemoSession } from '@/lib/demo-session';
import { Link } from '@/i18n/navigation';
import { Button, buttonClass } from '../ui/Button';

export function LoginForm() {
  const router = useRouter();
  const openStudentDemo = () => {
    saveDemoSession('STUDENT');
    router.replace('/portal');
  };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><CheckCircle2 className="size-4 text-success" /> Local student demo</p>
        <p className="mt-1 text-sm text-muted">This preview does not use real accounts or passwords. Open the sample student portal directly.</p>
      </div>
      <Button type="button" className="w-full" onClick={openStudentDemo}><GraduationCap className="me-2 size-4" />Open Student Portal</Button>
      <p className="text-center text-xs text-muted">Your demo session stays in this browser only.</p>
      <Link href="/admissions" className={buttonClass('outline', 'md', 'w-full')}>View admissions information</Link>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-line bg-cream-100 p-4 text-sm text-muted">Password reset is not available in the frontend-only demo because no real accounts or passwords are used.</p>
      <Link href="/login" className={buttonClass('brand', 'md', 'w-full')}>Back to student demo login</Link>
    </div>
  );
}
