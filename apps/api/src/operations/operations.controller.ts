import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { LibraryService } from './library.service';
import { ProcurementService } from './procurement.service';
import { RecordsService } from './records.service';

const Item = z.object({
  type: z.enum(['BOOK', 'EBOOK', 'JOURNAL', 'DATABASE', 'PAPER']), title: z.string().trim().min(2).max(300),
  author: z.string().trim().max(200).nullable().optional(), isbn: z.string().trim().max(20).nullable().optional(), subject: z.string().trim().max(120).nullable().optional(),
  year: z.coerce.number().int().min(1000).max(2100).nullable().optional(), url: z.url().max(1000).nullable().optional().or(z.literal('').transform(() => null)),
  copies: z.coerce.number().int().min(0).max(1000).default(1), isPublic: z.boolean().default(true),
});
const Issue = z.object({ itemId: z.uuid(), email: z.string().trim().toLowerCase().pipe(z.email()), days: z.coerce.number().int().min(1).max(120).default(14) });
const Pr = z.object({ title: z.string().trim().min(2).max(200), category: z.string().trim().min(2).max(80), vendor: z.string().trim().max(200).nullable().optional(), amountAed: z.coerce.number().min(0).max(100_000_000), priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'), notes: z.string().trim().max(2000).nullable().optional() });
const Move = z.object({ to: z.enum(['APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED']) });
const FacilityInput = z.object({ name: z.string().trim().min(2).max(120), status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'CLOSED']), note: z.string().trim().max(500).nullable().optional() });

@ApiTags('operations')
@ApiBearerAuth()
@Controller()
export class OperationsController {
  constructor(private readonly library: LibraryService, private readonly procurement: ProcurementService, private readonly records: RecordsService) {}

  // ── Library ──
  @Public() @Get('public/library') publicCatalogue(@Query('q') q?: string, @Query('type') type?: string) { return this.library.catalogue(q, type, true); }
  @Get('me/library/catalogue') catalogue(@Query('q') q?: string, @Query('type') type?: string) { return this.library.catalogue(q, type, true); }
  @Get('me/library/loans') myLoans(@CurrentUser() u: AuthUser) { return this.library.mine(u); }
  @HttpCode(200) @Post('me/library/loans/:id/renew') renewMine(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthUser) { return this.library.renew(id, u); }
  @RequirePermissions('library.manage') @Get('admin/library/overview') libraryOverview() { return this.library.overview(); }
  @RequirePermissions('library.manage') @Get('admin/library/items') items(@Query('q') q?: string, @Query('type') type?: string) { return this.library.catalogue(q, type, false); }
  @RequirePermissions('library.manage') @Post('admin/library/items') createItem(@Body(new ZodPipe(Item)) b: z.infer<typeof Item>) { return this.library.createItem(b); }
  @RequirePermissions('library.manage') @Put('admin/library/items/:id') updateItem(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(Item)) b: z.infer<typeof Item>) { return this.library.updateItem(id, b); }
  @RequirePermissions('library.manage') @HttpCode(204) @Delete('admin/library/items/:id') deleteItem(@Param('id', ParseUUIDPipe) id: string) { return this.library.deleteItem(id); }
  @RequirePermissions('library.manage') @Get('admin/library/loans') loans(@Query('all') all?: string) { return this.library.loans(all !== '1'); }
  @RequirePermissions('library.manage') @Post('admin/library/loans') issue(@Body(new ZodPipe(Issue)) b: z.infer<typeof Issue>) { return this.library.issue(b.itemId, b.email, b.days); }
  @RequirePermissions('library.manage') @HttpCode(200) @Post('admin/library/loans/:id/return') returnLoan(@Param('id', ParseUUIDPipe) id: string) { return this.library.returnLoan(id); }
  @RequirePermissions('library.manage') @HttpCode(200) @Post('admin/library/loans/:id/renew') renew(@Param('id', ParseUUIDPipe) id: string) { return this.library.renew(id); }

  // ── Procurement & campus operations ──
  @RequirePermissions('procurement.manage') @Get('admin/procurement/overview') procurementOverview() { return this.procurement.overview(); }
  @RequirePermissions('procurement.manage') @Get('admin/procurement/requests') requests(@Query('status') status?: string) { return this.procurement.list(status); }
  @RequirePermissions('procurement.manage') @Post('admin/procurement/requests') createPr(@Body(new ZodPipe(Pr)) b: z.infer<typeof Pr>, @CurrentUser() u: AuthUser) { return this.procurement.create(u, b); }
  @RequirePermissions('procurement.manage') @HttpCode(200) @Post('admin/procurement/requests/:id/status') move(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(Move)) b: z.infer<typeof Move>, @CurrentUser() u: AuthUser) { return this.procurement.move(u, id, b.to); }
  @RequirePermissions('procurement.manage') @Get('admin/facilities') facilities() { return this.procurement.facilities(); }
  @RequirePermissions('procurement.manage') @Put('admin/facilities') saveFacility(@Body(new ZodPipe(FacilityInput)) b: z.infer<typeof FacilityInput>) { return this.procurement.saveFacility(b); }
  @RequirePermissions('procurement.manage') @HttpCode(204) @Delete('admin/facilities/:id') deleteFacility(@Param('id', ParseUUIDPipe) id: string) { return this.procurement.deleteFacility(id); }

  // ── Registrar ──
  @RequirePermissions('records.manage') @Get('admin/records/overview') recordsOverview() { return this.records.overview(); }
  @RequirePermissions('records.manage') @Get('admin/records/students') students(@Query('q') q?: string) { return this.records.students(q); }
  @RequirePermissions('records.manage') @Get('admin/records/students/:id/transcript') transcript(@Param('id', ParseUUIDPipe) id: string) { return this.records.transcript(id); }
}
