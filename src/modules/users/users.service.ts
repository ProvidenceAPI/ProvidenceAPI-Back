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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
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

  async updateUser(id: string, dto: UpdateUserAdminDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update(id, dto);
    return this.getUserById(id);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === dto.status) {
      throw new BadRequestException('User already has this status');
    }
    if (user.rol === Rol.superAdmin) {
      throw new ForbiddenException('Cannot change SuperAdmin status');
    }
    if (dto.status === UserStatus.banned) {
      //cancelar reservas
    }
    user.status = dto.status;
    return this.userRepository.save(user);
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
    });
  }
}
