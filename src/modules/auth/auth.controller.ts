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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 200, description: 'Redirects to Google OAuth' })
  async googleAuth() {
    // Inicia el flujo de OAuth con Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with token',
  })
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      const token = await this.authService.googleLogin(req.user);

      // Redirige al frontend con el token en la URL
      res.redirect(
        `${process.env.FRONTEND_URL}/oauth?token=${token.access_token}`,
      );
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
  }
}
