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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateUserStatusDto } from './dtos/updateStatus.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ description: 'User list' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  @Roles(Rol.admin, Rol.superAdmin)
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ description: 'User found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  @Roles(Rol.superAdmin, Rol.admin)
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getUserById(id);
  }

  @ApiOperation({ summary: 'See my profile' })
  @ApiOkResponse({ description: 'User profile' })
  @ApiUnauthorizedResponse()
  @Get('me')
  getMyProfile(@Req() req) {
    return this.userService.getMyProfile(req.user.id);
  }

  @ApiOperation({ summary: 'Edit my profile' })
  @ApiOkResponse({ description: 'Updated profile' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @Put('me')
  updateMyProfile(@Req() req, @Body() dto: UpdateUserDto) {
    return this.userService.updateMyProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update user profile by ID' })
  @ApiOkResponse({ description: 'Updated profile' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @Put(':id')
  @Roles(Rol.superAdmin)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @ApiOperation({ summary: 'Update user or administrator status' })
  @ApiOkResponse({ description: 'Updated status' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @Put(':id/status')
  @Roles(Rol.superAdmin)
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.userService.updateStatus(id, dto);
  }

  @Put('profile/image')
  @UseInterceptors(FileInterceptor('file'))
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
}
