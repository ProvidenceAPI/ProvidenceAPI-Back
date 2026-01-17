import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Put,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Headers,
  HttpCode,
  UsePipes,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { UpdatePaymentStatusDto } from './dtos/update-paymentStatus.dto';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a payment for a reservation or subscription',
    description:
      'Creates a MercadoPago preference and returns the payment link',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created, returns MercadoPago link',
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Reservation or activity not found',
  })
  @ApiResponse({ status: 409, description: 'Reservation already paid' })
  createPayment(@Req() req, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(req.user.id, dto);
  }

  @Post('webhook')
  @UsePipes()
  @HttpCode(200)
  @ApiOperation({
    summary: 'MercadoPago webhook endpoint',
    description: 'Receives payment notifications from MercadoPago',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleWebhook(@Body() notification: any) {
    return this.paymentsService.handleWebhook(notification);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my payments history' })
  @ApiResponse({ status: 200, description: 'Payments list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyPayments(@Req() req) {
    return this.paymentsService.getMyPayments(req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments (Admin)' })
  @ApiResponse({ status: 200, description: 'All payments list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  getPaymentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Put(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment status (Admin)' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  updatePaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(id, dto.status);
  }
}
