import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Rol } from 'src/common/enum/roles.enum';
import { UsersService } from 'src/modules/users/users.service';
import { UserStatus } from 'src/common/enum/userStatus.enum';

interface JwtPayload {
  id: string;
  email: string;
  rol: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.usersService.getUserById(payload.id);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      if (user.status === UserStatus.banned) {
        throw new UnauthorizedException(
          'Tu cuenta ha sido suspendida. Contacta al administrador.',
        );
      }
      if (user.status === UserStatus.cancelled) {
        throw new UnauthorizedException('Tu cuenta ha sido cancelada.');
      }
      return {
        id: payload.id,
        email: payload.email,
        rol: payload.rol,
        status: user.status,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error validando token');
    }
  }
}
