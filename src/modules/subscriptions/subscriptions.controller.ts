import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorators';
import { Rol } from 'src/common/enum/roles.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly userActivitiesService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my active subscriptions' })
  @ApiResponse({ status: 200, description: 'Active subscriptions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMySubscriptions(@Req() req) {
    return this.userActivitiesService.getActiveSubscriptions(req.user.id);
  }

  @Get('me/all')
  @ApiOperation({ summary: 'Get all my subscriptions (including expired)' })
  @ApiResponse({ status: 200, description: 'All subscriptions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllMySubscriptions(@Req() req) {
    return this.userActivitiesService.getAllUserSubscriptions(req.user.id);
  }

  @Get('activity/:activityId/check')
  @ApiOperation({
    summary: 'Check if user has active subscription for activity',
  })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  async checkSubscription(
    @Req() req,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    const hasSubscription =
      await this.userActivitiesService.checkSubscriptionStatus(
        req.user.id,
        activityId,
      );
    return {
      activityId,
      hasActiveSubscription: hasSubscription,
    };
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Rol.admin, Rol.superAdmin)
  @ApiOperation({ summary: 'Get subscription statistics (Admin)' })
  @ApiResponse({ status: 200, description: 'Subscription stats' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getSubscriptionStats() {
    return this.userActivitiesService.getSubscriptionStats();
  }

  @Get('admin/expiring')
  @UseGuards(RolesGuard)
  @Roles(Rol.superAdmin)
  @ApiOperation({ summary: 'Get subscriptions expiring in 3 days (Admin)' })
  @ApiResponse({ status: 200, description: 'Expiring subscriptions' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getExpiringSubscriptions() {
    return this.userActivitiesService.getExpiringSubscriptions();
  }
}
