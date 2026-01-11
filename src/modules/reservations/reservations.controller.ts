import {
  UseGuards,
  Controller,
  Post,
  Req,
  Body,
  Put,
  Param,
  ParseUUIDPipe,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateReservationDto } from './dtos/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get('me')
  @Roles(Rol.user)
  @ApiOperation({ summary: 'Get my reservation history' })
  @ApiResponse({ status: 200, description: 'Reservation history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyReservations(@Req() req) {
    return this.service.getMyReservations(req.user.id);
  }

  @Post()
  @Roles(Rol.user)
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date or time range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is banned or cancelled' })
  @ApiResponse({ status: 409, description: 'Time slot already reserved' })
  create(@Req() req, @Body() dto: CreateReservationDto) {
    return this.service.createReservation(req.user.id, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Reservation already cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not allowed to cancel this reservation',
  })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  cancel(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelReservation(id, req.user);
  }

  @Get()
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get all reservations (Admin)' })
  @ApiResponse({ status: 200, description: 'All reservations list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – Admin role required' })
  getAllReservations() {
    return this.service.getAllReservations();
  }
}
