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

@Injectable()
export class UsersService {
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
    if (dto.status === UserStatus.banned) {
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
}
