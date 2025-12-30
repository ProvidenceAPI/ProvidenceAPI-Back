import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { SignupDto } from './dtos/singup.dto';
import { SigninDto } from './dtos/singin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

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

    if (age < 18) {
      throw new BadRequestException(
        'Debes ser mayor de 18 años para registrarte',
      );
    }
  }

  async createUser(user: SignupDto) {
    this.validateAge(user.birthdate);

    const findUserByEmail = await this.usersRepository.findOneBy({
      email: user.email,
    });
    if (findUserByEmail)
      throw new BadRequestException('El email ya esta registrado');

    const findUserByDni = await this.usersRepository.findOneBy({
      dni: user.dni,
    });
    if (findUserByDni) {
      throw new BadRequestException('El DNI ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(user.password, 12);
    try {
      const { confirmPassword, ...userData } = user;

      const newUser: User = this.usersRepository.create({
        ...userData,
        password: hashedPassword,
      });

      const savedUser = await this.usersRepository.save(newUser);

      const { password, ...userWithOutPassword } = savedUser;
      return {
        message: 'Usuario creado exitosamente',
        user: userWithOutPassword,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  async signin(Credentials: SigninDto) {
    const findUser = await this.usersRepository.findOneBy({
      email: Credentials.email,
    });
    if (!findUser) throw new BadRequestException('Credenciales Invalidas');

    if (findUser.status === UserStatus.banned) {
      throw new UnauthorizedException(
        'Tu cuenta ha sido baneada. Contacta al administrador',
      );
    }

    if (findUser.status === UserStatus.cancelled) {
      throw new UnauthorizedException('Tu cuenta ha sido cancelada');
    }

    try {
      const matchingPasswords = await bcrypt.compare(
        Credentials.password,
        findUser.password,
      );

      if (!matchingPasswords)
        throw new BadRequestException('Credenciales Invalidas');

      const payload = {
        id: findUser.id,
        email: findUser.email,
        rol: findUser.rol,
      };

      const token = this.jwtService.sign(payload);

      const { password, ...userWithoutPassword } = findUser;

      return {
        message: 'Login exitoso',
        access_token: token,
        user: userWithoutPassword,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Error en el proceso de login');
    }
  }
}
