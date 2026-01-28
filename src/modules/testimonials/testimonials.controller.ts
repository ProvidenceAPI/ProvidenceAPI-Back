import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TestimonialsService } from './testimonials.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { CreateTestimonialDto } from './dtos/createTestimonial.dto';

@ApiTags('Testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly service: TestimonialsService) {}

  @Get('approved')
  @ApiOperation({ summary: 'Get approved testimonials (Public)' })
  @ApiResponse({ status: 200, description: 'Approved testimonials list' })
  getApprovedTestimonials(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.service.getAllTestimonials(pageNum, limitNum);
  }

  @Get('check-eligibility')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can create testimonial' })
  @ApiResponse({ status: 200, description: 'Eligibility status' })
  checkEligibility(@Req() req) {
    return this.service.checkUserEligibility(req.user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a testimonial' })
  @ApiResponse({ status: 201, description: 'Testimonial created' })
  @ApiResponse({ status: 403, description: 'User not eligible' })
  create(@Req() req, @Body() dto: CreateTestimonialDto) {
    return this.service.create(req.user.id, dto);
  }
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete testimonial (Admin)' })
  @ApiResponse({ status: 200, description: 'Testimonial deleted' })
  deleteTestimonial(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteTestimonial(id);
  }
}
