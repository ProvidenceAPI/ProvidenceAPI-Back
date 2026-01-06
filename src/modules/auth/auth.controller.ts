import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SignupDto } from './dtos/singup.dto';
import { SigninDto } from './dtos/singin.dto';
import { AuthGuard } from '@nestjs/passport';

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
}
