import { Controller, ForbiddenException, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TemplatesService } from './templates.service';

// Roles that can query across all organizations
const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN'];
const ISSUER_ROLES = ['ISSUER_ADMIN', 'ISSUER_OPERATOR'];
// Sentinel UUID — no real org has this ID; produces an empty result set
const NO_ORG_SENTINEL = '00000000-0000-0000-0000-000000000000';

@ApiTags('Templates')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'templates', version: '1' })
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List templates scoped to the caller\'s organization' })
  async findAll(@Req() req: any) {
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    // Admins see ALL templates (no filter). Issuers see only their own org.
    // Non-org non-admin users get the sentinel → empty result (safe default).
    const orgFilter = isAdmin ? undefined : (req.user?.organizationId ?? NO_ORG_SENTINEL);
    const templates = await this.templatesService.findAll(orgFilter);
    // Map DB field names to frontend-expected names
    return templates.map((t) => ({
      ...t,
      name: t.displayName,
      nameAr: t.displayNameAr,
      status: t.active ? 'ACTIVE' : 'DRAFT',
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findById(@Param('id') id: string) {
    const t = await this.templatesService.findById(id);
    return {
      ...t,
      name: t.displayName,
      nameAr: t.displayNameAr,
      status: t.active ? 'ACTIVE' : 'DRAFT',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  create(
    @Body() body: { name: string; nameAr?: string; description?: string; schema?: any; organizationId?: string },
    @Req() req: any,
  ) {
    if (![...ADMIN_ROLES, 'ISSUER_ADMIN'].includes(req.user?.role)) {
      throw new ForbiddenException('Only issuer administrators can create templates.');
    }

    return this.templatesService.create({
      name: body.name,
      nameAr: body.nameAr,
      description: body.description || '',
      schema: body.schema || {},
      organizationId: body.organizationId || req.user?.organizationId || '',
      createdBy: req.user?.id || 'system',
    });
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a template' })
  publish(@Param('id') id: string, @Req() req: any) {
    if (![...ADMIN_ROLES, ...ISSUER_ROLES].includes(req.user?.role)) {
      throw new ForbiddenException('Only issuer roles can publish templates.');
    }
    return this.templatesService.publish(id, req.user);
  }
}
