import { BadRequestException, Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'storage', version: '1' })
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('ipfs')
  @ApiOperation({ summary: 'Store data on IPFS' })
  async store(@Body() body: { data: string }) {
    if (!body?.data || body.data.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Data is required and must not exceed 10 MB');
    }
    const cid = await this.storageService.storeToIpfs(body.data);
    return { cid };
  }

  @Get('ipfs/:cid')
  @ApiOperation({ summary: 'Retrieve data from IPFS' })
  async retrieve(@Param('cid') cid: string) {
    const data = await this.storageService.retrieveFromIpfs(cid);
    return { data: data.toString('utf8') };
  }
}
