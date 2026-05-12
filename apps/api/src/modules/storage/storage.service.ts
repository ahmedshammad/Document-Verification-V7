import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {}

  async storeToIpfs(data: Buffer | string): Promise<string> {
    const ipfsHost = this.configService.get('IPFS_HOST', 'localhost');
    const ipfsPort = this.configService.get('IPFS_PORT', 5001);

    try {
      const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const blobPart = payload.buffer.slice(
        payload.byteOffset,
        payload.byteOffset + payload.byteLength,
      ) as ArrayBuffer;
      const form = new FormData();
      form.append('file', new Blob([blobPart]), 'payload.bin');

      const response = await fetch(`http://${ipfsHost}:${ipfsPort}/api/v0/add?pin=true`, {
        method: 'POST',
        body: form as any,
      });

      if (!response.ok) {
        throw new Error(`IPFS add failed with HTTP ${response.status}`);
      }

      const result = (await response.json()) as { Hash?: string; Name?: string };
      if (!result.Hash) {
        throw new Error('IPFS add response did not include a CID');
      }

      this.logger.log(`Stored on IPFS: ${result.Hash}`);
      return result.Hash;
    } catch (error: any) {
      this.logger.error('IPFS storage failed', error);
      throw new ServiceUnavailableException(error?.message || 'IPFS storage failed');
    }
  }

  async retrieveFromIpfs(cid: string): Promise<Buffer> {
    const ipfsHost = this.configService.get('IPFS_HOST', 'localhost');
    const ipfsPort = this.configService.get('IPFS_PORT', 5001);

    if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
      throw new BadRequestException('Invalid IPFS CID');
    }

    try {
      const response = await fetch(`http://${ipfsHost}:${ipfsPort}/api/v0/cat?arg=${encodeURIComponent(cid)}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`IPFS cat failed with HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error: any) {
      this.logger.error(`IPFS retrieval failed for CID ${cid}`, error);
      throw new ServiceUnavailableException(error?.message || 'IPFS retrieval failed');
    }
  }

  encrypt(data: string, key: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex').slice(0, 32), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { encrypted, iv: iv.toString('hex') };
  }

  decrypt(encrypted: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex').slice(0, 32),
      Buffer.from(iv, 'hex'),
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
