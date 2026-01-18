import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationTemplate {
  NEW_ACTIVITY = 'new_activity',
  PROMOTION = 'promotion',
  CLOSURE = 'closure',
  ANNOUNCEMENT = 'announcement',
}

export class NotificationTemplateDto {
  @ApiProperty({
    enum: NotificationTemplate,
    example: NotificationTemplate.NEW_ACTIVITY,
    description: 'Tipo de plantilla de notificación',
  })
  @IsEnum(NotificationTemplate)
  @IsNotEmpty()
  template: NotificationTemplate;

  @ApiProperty({
    example: { activityName: 'Yoga Avanzado', instructor: 'María García' },
    description: 'Datos dinámicos para la plantilla',
  })
  @IsOptional()
  data?: Record<string, any>;
}
