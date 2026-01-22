import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Get,
  Res,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SignupDto } from './dtos/singup.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { UsersService } from 'src/modules/users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

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

  @Get('check-email/:email')
  @ApiOperation({ summary: 'Check if email is already registered' })
  @ApiResponse({ status: 200, description: 'Email availability checked' })
  async checkEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return { exists: !!user };
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
          example: 'sofia.canon@gmail.com',
        },
        password: {
          type: 'string',
          example: 'Contraseña123*',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  signin(@Req() req) {
    return this.authService.signin(req.user);
  }

  @Get('google/login')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  googleLogin() {}

  @Get('google/login/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${result.access_token}`,
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req) {
    const user = await this.usersService.getUserById(req.user.id);
    return user;
  }
}
