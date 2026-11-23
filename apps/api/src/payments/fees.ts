import type { PrismaService } from '../prisma/prisma.service';

/**
 * Application fee in fils from the confirmed `admissions.applicationFeeAed` setting.
 * Returns null when the fee has not been confirmed (applications cannot be submitted then).
 */
export async function applicationFeeFils(prisma: PrismaService): Promise<number | null> {
  const s = await prisma.siteSetting.findUnique({ where: { key: 'admissions.applicationFeeAed' } });
  if (!s || s.confirmation !== 'CONFIRMED' || s.valueEn === null || s.valueEn.trim() === '') return null;
  const aed = Number(s.valueEn);
  return Number.isFinite(aed) && aed >= 0 ? Math.round(aed * 100) : null;
}
