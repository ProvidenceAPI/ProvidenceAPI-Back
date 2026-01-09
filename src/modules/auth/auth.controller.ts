import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SignupDto } from './dtos/singup.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'user created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or user already exists',
  })
  async signup(@Body() user: SignupDto) {
    return this.authService.createUser(user);
  }

  @UseGuards(AuthGuard('local'))
  @Post('signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'user@email.com',
        },
        password: {
          type: 'string',
          example: 'Password123*',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  signin(@Req() req) {
    return this.authService.signin(req.user);
  }

  @Get('google/signup')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 200, description: 'Redirects to Google OAuth' })
  async googleSignup() {}

  @Get('google/signup/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with token',
  })
  async googleSignupCallback(@Req() req, @Res() res: Response) {
    try {
      const result = await this.authService.googleSignup(req.user);

      // Usar datos de req.user (vienen de Google Strategy)
      const googleUser: any = req.user; // Cast a any para evitar errores de tipo
      const userData = {
        id: 'google-user',
        name:
          googleUser.firstName +
          (googleUser.lastName ? ' ' + googleUser.lastName : ''),
        email: googleUser.email,
        profileImage: googleUser.picture || null,
        phone: null,
      };

      const userEncoded = Buffer.from(JSON.stringify(userData)).toString(
        'base64',
      );

      res.redirect(
        `${process.env.FRONTEND_URL}/oauth?token=${result.access_token}&user=${userEncoded}`,
      );
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      // Intenta login
      const result = await this.authService.googleLogin(req.user);

      // Usar datos de req.user (vienen de Google Strategy)
      const googleUser: any = req.user; // Cast a any para evitar errores de tipo
      const userData = {
        id: 'google-user',
        name:
          googleUser.firstName +
          (googleUser.lastName ? ' ' + googleUser.lastName : ''),
        email: googleUser.email,
        profileImage: googleUser.picture || null,
        phone: null,
      };

      const userEncoded = Buffer.from(JSON.stringify(userData)).toString(
        'base64',
      );

      res.redirect(
        `${process.env.FRONTEND_URL}/oauth?token=${result.access_token}&user=${userEncoded}`,
      );
    } catch (error) {
      // Si falla login, intenta signup
      try {
        const token = await this.authService.googleSignup(req.user);

        // Usar datos de req.user (vienen de Google Strategy)
        const googleUser: any = req.user; // Cast a any para evitar errores de tipo
        const userData = {
          id: 'google-user',
          name:
            googleUser.firstName +
            (googleUser.lastName ? ' ' + googleUser.lastName : ''),
          email: googleUser.email,
          profileImage: googleUser.picture || null,
          phone: null,
        };

        const userEncoded = Buffer.from(JSON.stringify(userData)).toString(
          'base64',
        );

        res.redirect(
          `${process.env.FRONTEND_URL}/oauth?token=${token.access_token}&user=${userEncoded}`,
        );
      } catch (err) {
        res.status(500).send({ success: false, message: err.message });
      }
    }
  }

  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  googleLogin() {}

  @Get('google/login/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req, @Res() res: Response) {
    try {
      const result = await this.authService.googleLogin(req.user);

      // Usar datos de req.user (vienen de Google Strategy)
      const googleUser: any = req.user; // Cast a any para evitar errores de tipo
      const userData = {
        id: 'google-user',
        name:
          googleUser.firstName +
          (googleUser.lastName ? ' ' + googleUser.lastName : ''),
        email: googleUser.email,
        profileImage: googleUser.picture || null,
        phone: null,
      };

      const userEncoded = Buffer.from(JSON.stringify(userData)).toString(
        'base64',
      );

      res.redirect(
        `${process.env.FRONTEND_URL}/oauth?token=${result.access_token}&user=${userEncoded}`,
      );
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
  }
}
