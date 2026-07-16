import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from './mailer.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService (Password Recovery)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_current_password_1234567890',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test_secret';
      if (key === 'CLIENT_URL') return 'http://localhost:4200';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should generate a token and send an email if user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('valid_reset_jwt_token');

      await service.forgotPassword('test@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          hash: mockUser.password_hash.substring(0, 15),
        },
        expect.any(Object),
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        'test@example.com',
        'Recuperación de Contraseña - SISCOP NEXT',
        expect.stringContaining('http://localhost:4200/reset-password?token=valid_reset_jwt_token'),
      );
    });

    it('should fail silently (not throw/not send mail) if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword('nonexistent@example.com');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update password and invalidate token signature on success', async () => {
      const decodedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        hash: 'hashed_current_'.substring(0, 15),
      };

      mockJwtService.verifyAsync.mockResolvedValue(decodedPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, password_hash: 'new_hashed_password' });

      await service.resetPassword('valid_token', 'newPassword123');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token', { secret: 'test_secret' });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      
      // Verification of bcrypt hashing and DB update call
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          password_hash: expect.any(String),
        },
      });
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.resetPassword('invalid_token', 'newPassword123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token hash does not match current DB password hash (already used)', async () => {
      const decodedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        hash: 'old_expired_hash', // Mismatch with mockUser.password_hash
      };

      mockJwtService.verifyAsync.mockResolvedValue(decodedPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.resetPassword('already_used_token', 'newPassword123')).rejects.toThrow(
        new BadRequestException('El enlace de recuperación ya ha sido utilizado.'),
      );

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });
});
