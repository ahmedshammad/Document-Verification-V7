import { Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet information' })
  getWalletInfo(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authentication required');
    return this.walletService.getWalletInfo(req.user?.id);
  }

  @Post('rotate-keys')
  @ApiOperation({ summary: 'Rotate encryption keys' })
  rotateKeys(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authentication required');
    return this.walletService.rotateKeys(req.user?.id);
  }
}
