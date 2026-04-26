import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';

export class CheckoutRequestDto {
    @ApiProperty({ enum: SubscriptionPlan })
    @IsEnum(SubscriptionPlan)
    plan: SubscriptionPlan;
}
