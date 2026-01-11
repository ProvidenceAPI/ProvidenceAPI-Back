import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateUserStatusDto } from './dtos/updateStatus.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserAdminDto } from './dtos/updateUser-Admin.dto';
import { CompleteGoogleProfileDto } from './dtos/complete-google.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProfile(@Req() req) {
    return this.userService.getMyProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMyProfile(@Req() req, @Body() dto: UpdateUserDto) {
    return this.userService.updateMyProfile(req.user.id, dto);
  }

  @Put('profile/image')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(png|jpg|jpeg|webp)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2_000_000,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update profile image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile image updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfileImage(@Req() req, @UploadedFile() file: Express.Multer.File) {
    console.log('FILE ACCEPTED:', file?.mimetype);
    return this.userService.updateProfileImage(req.user.id, file);
  }

  @Put('profile/image-url')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update profile image by URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          example: 'https://example.com/profile.jpg',
        },
      },
      required: ['imageUrl'],
    },
  })
  @ApiResponse({ status: 200, description: 'Profile image updated' })
  @ApiResponse({ status: 400, description: 'Invalid image URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfileImageByUrl(@Req() req, @Body('imageUrl') imageUrl: string) {
    return this.userService.updateProfileImage(
      req.user.id,
      undefined,
      imageUrl,
    );
  }

  @Put('profile/complete-profile')
  @UseGuards(AuthGuard('jwt'))
  completeProfile(@Req() req, @Body() dto: CompleteGoogleProfileDto) {
    return this.userService.completeGoogleProfile(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get all users (Admin)' })
  @ApiResponse({ status: 200, description: 'User list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.superAdmin)
  @ApiOperation({ summary: 'Update user profile by ID (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.superAdmin)
  @ApiOperation({ summary: 'Update user status (SuperAdmin)' })
  @ApiResponse({ status: 200, description: 'Updated status' })
  @ApiResponse({ status: 400, description: 'Invalid status change' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userService.updateStatus(id, dto);
  }
}
