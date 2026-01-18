import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dtos/send-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('admin/send-announcement')
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Send announcement to all users (Admin)' })
  @ApiResponse({ status: 200, description: 'Announcement sent successfully' })
  async sendAnnouncement(@Body() dto: SendNotificationDto) {
    return await this.notificationsService.sendNotificationToAll(dto);
  }

  @Post('admin/send-promotion')
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { example: '¡Promoción Especial!' },
        message: { example: 'Solo por hoy se hará efectivo este descuento' },
        discount: { example: '25%' },
        validUntil: { example: '2025-01-18' },
      },
    },
  })
  @ApiOperation({ summary: 'Send promotion to all users (Admin)' })
  @ApiResponse({ status: 200, description: 'Promotion sent successfully' })
  async sendPromotion(
    @Body()
    body: {
      title: string;
      message: string;
      discount?: string;
      validUntil?: string;
    },
  ) {
    return await this.notificationsService.sendPromotionNotification(body);
  }

  @Post('admin/send-closure')
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { example: '1 febrero 2026' },
        reason: { example: 'Por Limpieza del local' },
        reopenDate: { example: '2 febrero 2026' },
      },
    },
  })
  @ApiOperation({ summary: 'Notify temporary closure (Admin)' })
  @ApiResponse({ status: 200, description: 'Closure notification sent' })
  async sendClosure(
    @Body()
    body: {
      date: string;
      reason: string;
      reopenDate?: string;
    },
  ) {
    return await this.notificationsService.sendClosureNotification(body);
  }

  @Post('admin/send-to-user/:userId')
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Send notification to specific user (Admin)' })
  @ApiResponse({ status: 200, description: 'Notification sent to user' })
  async sendToUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SendNotificationDto,
  ) {
    return await this.notificationsService.sendNotificationToUser(userId, dto);
  }
}
