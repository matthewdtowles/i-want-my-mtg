import { BaseViewDto } from 'src/http/base/base.view.dto';

export class NotificationListViewDto extends BaseViewDto {
    readonly hasNotifications: boolean;

    constructor(init: Partial<NotificationListViewDto>) {
        super(init);
        this.hasNotifications = init.hasNotifications || false;
    }
}
