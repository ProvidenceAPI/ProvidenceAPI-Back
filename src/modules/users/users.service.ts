import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers() {
    return await this.userRepository.find();
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
}
