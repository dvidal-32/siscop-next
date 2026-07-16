import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'siscop_next_refresh_secret_key_456',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; email: string; tenantId: string }) {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token es requerido');
    }
    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      refreshToken,
    };
  }
}
