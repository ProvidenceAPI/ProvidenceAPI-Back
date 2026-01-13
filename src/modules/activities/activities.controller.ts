import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Patch,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dtos/create-activity.dto';
import { UpdateActivityDto } from './dtos/update-activity.dto';
import { FilterActivityDto } from './dtos/filter-activity.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}
  @Get()
  @ApiOperation({ summary: 'Get all activities with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
  })
  @ApiQuery({ type: FilterActivityDto, required: false })
  findAll(@Query() filterDto: FilterActivityDto) {
    return this.activitiesService.findAll(filterDto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get only active activities' })
  @ApiResponse({ status: 200, description: 'Active activities retrieved' })
  getActiveActivities() {
    return this.activitiesService.getActiveActivities();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity found' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.activitiesService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new activity (Admin only)' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update activity (Admin only)' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Put(':id/image')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
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
        fileSize: 2_000_000, // 2MB
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload activity image to Cloudinary (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  uploadActivityImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.activitiesService.updateActivityImage(id, file);
  }

  @Put(':id/image-url')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update activity image by URL (Admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          example: 'https://example.com/activity.jpg',
        },
      },
      required: ['imageUrl'],
    },
  })
  @ApiResponse({ status: 200, description: 'Image URL updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid image URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  updateActivityImageByUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    return this.activitiesService.updateActivityImage(id, undefined, imageUrl);
  }

  @Patch(':id/toggle-status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle activity status (Active/Inactive)' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.activitiesService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete activity (SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Activity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin role required',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.activitiesService.remove(id);
  }
}
