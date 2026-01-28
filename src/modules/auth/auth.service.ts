import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { SignupDto } from './dtos/singup.dto';
import { UsersService } from 'src/modules/users/users.service';
import { Genre } from 'src/common/enum/genre.enum';
import { AuthProvider } from 'src/common/enum/authProvider.enum';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly mailservice: MailService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) return null;
    if (!user.password)
      throw new UnauthorizedException(
        'This account was created with Google. Please sign in with Google.',
      );
    if (user.provider === AuthProvider.GOOGLE)
      throw new UnauthorizedException('This account uses Google login');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _, ...result } = user;
    return result;
  }

  private validateAge(birthdate: Date): void {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    if (age < 16) {
      throw new BadRequestException(
        'You must be at least 16 years old to register',
      );
    }
  }

  async createUser(user: SignupDto) {
    this.validateAge(user.birthdate);

    const findUserByEmail = await this.usersRepository.findOneBy({
      email: user.email,
    });
    if (findUserByEmail)
      throw new BadRequestException('The email is already registered');

    const findUserByDni = await this.usersRepository.findOneBy({
      dni: user.dni,
    });
    if (findUserByDni) {
      throw new BadRequestException('The DNI is already register');
    }

    const hashedPassword = await bcrypt.hash(user.password, 12);
    try {
      const { confirmPassword, ...userData } = user;

      const newUser: User = this.usersRepository.create({
        ...userData,
        password: hashedPassword,
      });

      const savedUser = await this.usersRepository.save(newUser);

      const { password, status, rol, provider, ...userResponse } = savedUser;

      this.sendWelcomeEmailAsync(savedUser).catch((error) => {
        this.logger.error(
          `Failed to send welcome email to ${savedUser.email} after user creation`,
          error?.stack || error,
        );
      });

      this.logger.log(`✅ User created successfully: ${savedUser.email}`);

      return {
        message: 'User created successfully',
        user: userResponse,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error creating the user');
    }
  }

  private async sendWelcomeEmailAsync(user: User): Promise<void> {
    try {
      this.logger.log(`📧 Attempting to send welcome email to ${user.email}`);

      const imagesBase = this.configService.get<string>('MAIL_IMAGES_BASE_URL');
      const defaultLogo =
        'https://eyekwfc.stripocdn.email/content/guids/CABINET_244a3e1e0a19415b15c4a1f890ecc2695d36fa1f67537bb8fd41784de885a3ed/images/logo_actualzado.png';
      const defaultWelcome =
        'https://eyekwfc.stripocdn.email/content/guids/CABINET_e58281e79efa4826fb954d25a9c2fc9c708007582f274232a20a09158c6b84fc/images/istockphoto1369575748612x612_8QX.jpg';
      const defaultFb =
        'https://eyekwfc.stripocdn.email/content/assets/img/social-icons/rounded-black/facebook-rounded-black.png';
      const defaultIg =
        'https://eyekwfc.stripocdn.email/content/assets/img/social-icons/rounded-black/instagram-rounded-black.png';
      const defaultX =
        'https://eyekwfc.stripocdn.email/content/assets/img/social-icons/rounded-black/x-rounded-black.png';

      await this.mailservice.sendWelcomeEmail(user.email, {
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        userDNI: user.dni.toString(),
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
        logoUrl: imagesBase ? `${imagesBase}/logo.png` : defaultLogo,
        welcomeImageUrl: imagesBase ? `${imagesBase}/welcome.jpg` : defaultWelcome,
        facebookIconUrl: imagesBase ? `${imagesBase}/facebook.png` : defaultFb,
        instagramIconUrl: imagesBase ? `${imagesBase}/instagram.png` : defaultIg,
        xIconUrl: imagesBase ? `${imagesBase}/x.png` : defaultX,
      });

      this.logger.log(`✅ Welcome email sent successfully to ${user.email}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send welcome email to ${user.email}:`,
        error?.message || error,
      );
      this.logger.error(`Error details:`, error?.stack || error);
    }
  }

  signin(user: User) {
    if (user.status === UserStatus.banned) {
      throw new UnauthorizedException(
        'Your account has been banned. Contact the administrator',
      );
    }
    if (user.status === UserStatus.cancelled) {
      throw new UnauthorizedException('Your account has been cancelled');
    }

    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
    };

    const token = this.jwtService.sign(payload);
    const { password, ...userWithoutPassword } = user;
    return {
      message: 'Login successful',
      access_token: token,
    };
  }

  async googleLogin(googleUser: any) {
    const { email, firstName, lastName, picture } = googleUser;
    let user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      user = this.usersRepository.create({
        email,
        name: firstName,
        lastname: lastName || 'GOOGLE',
        profileImage: picture,
        provider: AuthProvider.GOOGLE,
        status: UserStatus.active,
        rol: Rol.user,
        password: null,
        birthdate: new Date('2000-01-01'),
        phone: '0000000000',
        dni: Math.floor(Math.random() * 1000000000),
        genre: Genre.other,
      });
      await this.usersRepository.save(user);

      const newUserEmail = user.email;
      this.sendWelcomeEmailAsync(user).catch((error) => {
        this.logger.error(
          `Failed to send welcome email to ${newUserEmail} after Google signup`,
          error?.stack || error,
        );
      });
    }
    if (user.status === UserStatus.banned) {
      throw new UnauthorizedException(
        'Account banned. Contact the administrator',
      );
    }
    if (user.status === UserStatus.cancelled) {
      throw new UnauthorizedException(
        'Account cancelled. Contact the administrator',
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async handleGoogleCallback(googleUser: any): Promise<{
    success: boolean;
    redirectUrl: string;
  }> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    try {
      const result = await this.googleLogin(googleUser);
      return {
        success: true,
        redirectUrl: `${frontendUrl}/auth/callback?token=${result.access_token}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('banned') ||
          errorMessage.includes('suspendida')
        ) {
          return {
            success: false,
            redirectUrl: `${frontendUrl}/auth/callback?error=account_banned`,
          };
        }
        if (
          errorMessage.includes('cancelled') ||
          errorMessage.includes('cancelada')
        ) {
          return {
            success: false,
            redirectUrl: `${frontendUrl}/auth/callback?error=account_cancelled`,
          };
        }
        return {
          success: false,
          redirectUrl: `${frontendUrl}/auth/callback?error=unauthorized`,
        };
      }
      this.logger.error('Error in Google authentication:', error);
      return {
        success: false,
        redirectUrl: `${frontendUrl}/auth/callback?error=authentication_failed`,
      };
    }
  }
}
