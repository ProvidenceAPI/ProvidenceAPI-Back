// src/modules/admin-notifications/admin-notifications.controller.ts

import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { AdminNotificationsService } from './admin-notifications.service';
import { Rol } from '../../common/enum/roles.enum';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorators';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin, Rol.superAdmin)
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  // 🎉 Notificar nueva actividad
  @Post('new-activity')
  @ApiOperation({ summary: 'Notify all users about a new activity' })
  async notifyNewActivity(
    @Body()
    body: {
      activityName: string;
      description: string;
      price: number;
      schedule: string;
    },
  ) {
    return await this.adminNotificationsService.notifyNewActivity(body);
  }

  @Post('holiday-closure')
  @ApiOperation({ summary: 'Notify all users about gym closure for holiday' })
  async notifyHolidayClosure(
    @Body()
    body: {
      holidayDate: string;
      reopenDate?: string;
      customMessage?: string;
    },
  ) {
    return await this.adminNotificationsService.notifyHolidayClosure(body);
  }

  @Post('promotion')
  @ApiOperation({ summary: 'Send promotion notification to all users' })
  async notifyPromotion(
    @Body()
    body: {
      title: string;
      description: string;
      discount?: string;
      validUntil?: string;
      actionUrl?: string;
    },
  ) {
    return await this.adminNotificationsService.notifyPromotion(body);
  }

  @Post('important-notice')
  @ApiOperation({ summary: 'Send important notice to all users' })
  async notifyImportantNotice(
    @Body()
    body: {
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    },
  ) {
    return await this.adminNotificationsService.notifyImportantNotice(body);
  }

  @Get('holidays/upcoming')
  @ApiOperation({ summary: 'Get upcoming holidays in Argentina' })
  getUpcomingHolidays(@Query('days') days?: number) {
    return this.adminNotificationsService.getUpcomingHolidays(
      days ? parseInt(days.toString()) : 30,
    );
  }

  @Get('holidays/all')
  @ApiOperation({ summary: 'Get all holidays in Argentina for 2026' })
  getAllHolidays() {
    return this.adminNotificationsService.getAllHolidays();
  }
}
