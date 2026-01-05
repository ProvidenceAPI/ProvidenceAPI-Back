import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SignupDto } from './dtos/singup.dto';
import { SigninDto } from './dtos/singin.dto';

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
  signup(@Body() user: SignupDto) {
    return this.authService.createUser(user);
  }
  @Post('signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sing in' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  @ApiResponse({ status: 401, description: 'User banned or cancelled' })
  signin(@Body() credentials: SigninDto) {
    return this.authService.signin(credentials);
  }
}
