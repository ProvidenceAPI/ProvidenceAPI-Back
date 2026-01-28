import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { UpdateUserStatusDto } from './dtos/updateStatus.dto';
import { UpdateUserAdminDto } from './dtos/updateUser-Admin.dto';
import { Rol } from 'src/common/enum/roles.enum';
import { FileUploadService } from '../file-upload/file-upload.service';
import { ReservationsService } from '../reservations/reservations.service';
import { AuthProvider } from 'src/common/enum/authProvider.enum';
import { CompleteGoogleProfileDto } from './dtos/complete-google.dto';
import { CreateUserAdminDto } from './dtos/create-user-admin.dto';
import * as bcrypt from 'bcrypt';
import { Genre } from 'src/common/enum/genre.enum';

@Injectable()
export class UsersService {
  findById(id: any) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly fileUploadService: FileUploadService,
    private readonly reservationsService: ReservationsService,
  ) {}

  async getAllUsers() {
    try {
      return await this.userRepository.find({
        select: {
          password: false,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  async findAllActive(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { status: UserStatus.active },
        select: {
          password: false,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Error fetching active users');
    }
  }

  async getUserById(id: string) {
    try {
      const findUser = await this.userRepository.findOne({ where: { id } });
      if (!findUser) throw new NotFoundException('User not found');
      const { password, ...rest } = findUser;
      return rest;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error loading user');
    }
  }

  async getMyProfile(userId: string) {
    return await this.getUserById(userId);
  }

  async updateMyProfile(userId: string, dto: UpdateUserDto) {
    await this.userRepository.update(userId, dto);
    return this.getUserById(userId);
  }

  async completeGoogleProfile(userId: string, dto: CompleteGoogleProfileDto) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (!user || user.provider !== AuthProvider.GOOGLE)
      throw new BadRequestException('Only Google users can complete profile');

    user.dni = dto.dni;
    user.phone = dto.phone;
    user.birthdate = dto.birthdate;
    user.status = UserStatus.active;

    return this.userRepository.save(user);
  }

  async updateUser(id: string, dto: UpdateUserAdminDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(id, dto);
    return this.getUserById(id);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === dto.status)
      throw new BadRequestException('User already has this status');
    if (user.rol === Rol.superAdmin)
      throw new ForbiddenException('Cannot change SuperAdmin status');
    if (
      dto.status === UserStatus.banned ||
      dto.status === UserStatus.cancelled
    ) {
      await this.reservationsService.cancelAllActiveReservationsByUser(id);
    }
    user.status = dto.status;
    return this.userRepository.save(user);
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async updateProfileImage(
    userId: string,
    file?: Express.Multer.File,
    imageUrl?: string,
  ) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (user?.status === UserStatus.banned) throw new ForbiddenException();

    let finalUrl: string;
    if (file) {
      finalUrl = await this.fileUploadService.uploadImage(file);
    } else if (imageUrl) {
      finalUrl = imageUrl;
    } else {
      throw new BadRequestException();
    }
    user.profileImage = finalUrl;
    await this.userRepository.save(user);
    return user;
  }

  async updateUserRole(id: string, newRole: Rol) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.rol === newRole) {
      throw new BadRequestException('User already has this role');
    }
    if (user.rol === Rol.superAdmin) {
      throw new ForbiddenException('Cannot change SuperAdmin role');
    }
    if (newRole === Rol.superAdmin) {
      throw new ForbiddenException('Cannot promote users to SuperAdmin');
    }
    user.rol = newRole;
    await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUserByAdmin(dto: CreateUserAdminDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }
    const existingDni = await this.userRepository.findOne({
      where: { dni: Number(dto.dni) },
    });
    if (existingDni) {
      throw new BadRequestException('DNI already exists');
    }
    if (dto.role === Rol.superAdmin) {
      throw new ForbiddenException('Cannot create SuperAdmin users');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = new User();
    newUser.name = dto.name;
    newUser.lastname = dto.lastname;
    newUser.email = dto.email;
    newUser.password = hashedPassword;
    newUser.birthdate = new Date(dto.birthdate);
    newUser.phone = dto.phone;
    newUser.dni = Number(dto.dni);
    newUser.genre = dto.genre || Genre.other;
    newUser.rol = dto.role || Rol.user;
    newUser.status = UserStatus.active;
    newUser.provider = AuthProvider.LOCAL;

    if (dto.profileImage) {
      newUser.profileImage = dto.profileImage;
    }
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async checkAvailability(
    email?: string,
    dni?: string,
    phone?: string,
  ): Promise<{ emailTaken: boolean; dniTaken: boolean; phoneTaken: boolean }> {
    const [emailTaken, dniTaken, phoneTaken] = await Promise.all([
      email?.trim()
        ? this.userRepository.findOne({ where: { email: email.trim() } }).then((u) => !!u)
        : Promise.resolve(false),
      dni != null && String(dni).trim() !== ''
        ? this.userRepository.findOne({ where: { dni: Number(dni) } }).then((u) => !!u)
        : Promise.resolve(false),
      phone?.trim()
        ? this.userRepository.findOne({ where: { phone: phone.trim() } }).then((u) => !!u)
        : Promise.resolve(false),
    ]);
    return { emailTaken, dniTaken, phoneTaken };
  }

  async getUserStats() {
    const [total, active, inactive, banned] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { status: UserStatus.active },
      }),
      this.userRepository.count({
        where: { status: UserStatus.cancelled },
      }),
      this.userRepository.count({
        where: { status: UserStatus.banned },
      }),
    ]);

    return { total, active, inactive, banned };
  }
}
