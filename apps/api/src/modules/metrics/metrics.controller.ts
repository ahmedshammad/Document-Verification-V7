import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'metrics', version: '1' })
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  getDashboard() {
    return this.metricsService.getDashboard();
  }

  @Get('issuance')
  @ApiOperation({ summary: 'Get issuance metrics' })
  getIssuance() {
    return this.metricsService.getIssuanceMetrics();
  }

  @Get('verification')
  @ApiOperation({ summary: 'Get verification metrics' })
  getVerification() {
    return this.metricsService.getVerificationMetrics();
  }
}
