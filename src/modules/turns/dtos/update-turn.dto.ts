import { ApiProperty, PartialType } from '@nestjs/swagger';
import { TurnStatus } from '../entities/turn.entity';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTurnDto } from './create-turn.dto';

export class UpdateTurnDto extends PartialType(CreateTurnDto) {
  @ApiProperty({
    enum: TurnStatus,
    example: TurnStatus.cancelled,
    description: 'Status of the turn',
    required: false,
  })
  @IsOptional()
  @IsEnum(TurnStatus)
  status?: TurnStatus;
}
