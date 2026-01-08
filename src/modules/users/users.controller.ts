import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
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
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProfile(@Req() req) {
    return this.userService.getMyProfile(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMyProfile(@Req() req, @Body() dto: UpdateUserDto) {
    return this.userService.updateMyProfile(req.user.id, dto);
  }

  @Put('profile/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update profile image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        imageUrl: { type: 'string', example: 'https://...' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile image updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfileImage(
    @Req() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2_000_000 }),
          new FileTypeValidator({ fileType: /(png|jpg|jpeg|webp)$/ }),
        ],
      }),
    )
    file?: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
  ) {
    return this.userService.updateProfileImage(req.user.id, file, imageUrl);
  }

  @Put('me/complete-profile')
  @UseGuards(AuthGuard('jwt'))
  completeProfile(@Req() req, @Body() dto: CompleteGoogleProfileDto) {
    return this.userService.completeGoogleProfile(req.user.id, dto);
  }

  @Get()
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get all users (Admin)' })
  @ApiResponse({ status: 200, description: 'User list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
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
