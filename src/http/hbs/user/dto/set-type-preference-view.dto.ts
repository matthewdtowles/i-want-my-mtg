export interface SetTypeOption {
    readonly value: string;
    readonly label: string;
    readonly selected: boolean;
}

export class SetTypePreferenceViewDto {
    readonly usingDefault: boolean;
    readonly primary: SetTypeOption[];
    readonly advanced: SetTypeOption[];
    readonly advancedSelectedCount: number;

    constructor(init: Partial<SetTypePreferenceViewDto>) {
        this.usingDefault = init.usingDefault ?? true;
        this.primary = init.primary ?? [];
        this.advanced = init.advanced ?? [];
        this.advancedSelectedCount = init.advancedSelectedCount ?? 0;
    }
}
