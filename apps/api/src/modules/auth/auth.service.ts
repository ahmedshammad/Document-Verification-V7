import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly selfRegistrationRoles = new Set(['SME_USER', 'ISSUER_ADMIN', 'ISSUER_OPERATOR', 'VERIFIER_USER']);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active. Please contact your administrator.');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        details: { email: user.email },
      },
    });

    return {
      accessToken,
      access_token: accessToken,
      refreshToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
        locale: user.locale || 'en',
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationName?: string;
  }) {
    const email = data.email?.toLowerCase().trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException('A valid email address is required');
    }
    if (!data.password || data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    const role = data.role || 'SME_USER';
    if (!this.selfRegistrationRoles.has(role)) {
      throw new BadRequestException('Unsupported self-registration role');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user account with this email already exists');
    }

    const isIssuerRole = role === 'ISSUER_ADMIN' || role === 'ISSUER_OPERATOR';
    if (isIssuerRole && !data.organizationName?.trim()) {
      throw new BadRequestException('Organization name is required for issuer accounts');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      let organizationId: string | undefined;

      if (isIssuerRole) {
        const orgSlug = crypto.randomUUID().split('-')[0];
        const org = await tx.organization.create({
          data: {
            orgId: `org-${orgSlug}`,
            name: data.organizationName!.trim(),
            type: 'TRAINING_PROVIDER',
            mspId: `Org${orgSlug}MSP`,
            contactEmail: email,
            contactPerson: `${data.firstName.trim()} ${data.lastName.trim()}`,
            active: false,
            registrationStatus: 'PENDING',
          },
        });
        organizationId = org.id;
      }

      return tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          role: role as any,
          status: 'ACTIVE',
          organizationId,
        },
      });
    });

    // Send welcome email (fire-and-forget — never block registration)
    this.emailService.sendWelcome({ firstName: user.firstName, email: user.email, role: user.role }).catch(() => {});

    return this.login(email, data.password);
  }

  async logout(userId: string, token: string) {
    if (!userId || !token) {
      throw new UnauthorizedException('A valid authenticated session is required');
    }

    await this.prisma.session.deleteMany({
      where: { userId, token },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGOUT',
        userId,
        details: {},
      },
    });

    return { success: true };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        userId: payload.sub,
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { organization: true } } },
    });

    if (!session || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const newPayload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      organizationId: session.user.organizationId,
    };
    const accessToken = this.jwtService.sign(newPayload);

    await this.prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      accessToken,
      access_token: accessToken,
      refreshToken,
      refresh_token: refreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        organizationId: session.user.organizationId,
        organizationName: session.user.organization?.name,
        locale: session.user.locale || 'en',
      },
    };
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Silent return — never reveal whether the email exists (prevent enumeration)
    if (!user) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordReset({ firstName: user.firstName, email: user.email }, resetUrl);
    this.logger.log(`Password reset email sent to ${user.email}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (!rawToken || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset link');
    }
    if (tokenRecord.usedAt) {
      throw new BadRequestException('This reset link has already been used');
    }
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions for security
      this.prisma.session.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${tokenRecord.user.email}`);
  }
}
