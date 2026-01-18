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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TurnsService } from './turns.service';
import { CreateTurnDto } from './dtos/create-turn.dto';
import { UpdateTurnDto } from './dtos/update-turn.dto';
import { GenerateTurnsDto } from './dtos/generate-turns.dto';
import { FilterTurnsDto } from './dtos/filter-turns.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';

@ApiTags('Turns')
@Controller('turns')
export class TurnsController {
  constructor(private readonly turnsService: TurnsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all turns with optional filters (Public)',
  })
  @ApiResponse({ status: 200, description: 'Turns retrieved successfully' })
  findAll(@Query() filterDto: FilterTurnsDto) {
    return this.turnsService.findAll(filterDto);
  }

  @Get('available/:activityId')
  @ApiOperation({
    summary: 'Get available turns for a specific activity (Public)',
  })
  @ApiResponse({ status: 200, description: 'Available turns retrieved' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  getAvailableTurns(
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Query('startDate') startDate?: string,
  ) {
    return this.turnsService.getAvailableTurnsForActivity(
      activityId,
      startDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get turn by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Turn found' })
  @ApiResponse({ status: 404, description: 'Turn not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.turnsService.findOne(id);
  }

  @Post('generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate turns automatically based on activity schedule (Admin)',
  })
  @ApiResponse({
    status: 201,
    description: 'Turns generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  generateTurns(@Body() dto: GenerateTurnsDto) {
    return this.turnsService.generateTurns(dto);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a turn manually (Admin)' })
  @ApiResponse({ status: 201, description: 'Turn created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Turn already exists' })
  create(@Body() dto: CreateTurnDto) {
    return this.turnsService.createTurn(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a turn (Admin)' })
  @ApiResponse({ status: 200, description: 'Turn updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Turn not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTurnDto) {
    return this.turnsService.update(id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a turn (Admin)' })
  @ApiResponse({ status: 200, description: 'Turn cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Turn already cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Turn not found' })
  cancelTurn(@Param('id', ParseUUIDPipe) id: string) {
    return this.turnsService.cancelTurn(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a turn (SuperAdmin only, no reservations)',
  })
  @ApiResponse({ status: 200, description: 'Turn deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete turn with existing reservations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiResponse({ status: 404, description: 'Turn not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.turnsService.remove(id);
  }
}
