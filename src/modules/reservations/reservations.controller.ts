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
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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

  @Post()
  @Roles(Rol.user)
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created' })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(@Req() req, @Body() dto: CreateReservationDto) {
    return this.service.createReservation(req.user.id, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  cancel(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelReservation(id, req.user);
  }

  @Get('me')
  @Roles(Rol.user)
  @ApiOperation({ summary: 'Get my reservation history' })
  @ApiResponse({ status: 200, description: 'Reservation history' })
  getMyReservations(@Req() req) {
    return this.service.getMyReservations(req.user.id);
  }

  @Get()
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get all reservations (admin)' })
  @ApiResponse({ status: 200, description: 'All reservations' })
  getAllReservations() {
    return this.service.getAllReservations();
  }
}
