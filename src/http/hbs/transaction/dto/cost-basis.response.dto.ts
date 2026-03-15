export class CostBasisResponseDto {
    readonly totalCost: string;
    readonly totalQuantity: number;
    readonly averageCost: string;
    readonly unrealizedGain: string;
    readonly unrealizedGainSign: string;
    readonly realizedGain: string;
    readonly realizedGainSign: string;
    readonly currentValue: string;
    readonly roi: string;
    readonly roiSign: string;
    readonly hasData: boolean;

    constructor(init: Partial<CostBasisResponseDto>) {
        this.totalCost = init.totalCost || '-';
        this.totalQuantity = init.totalQuantity || 0;
        this.averageCost = init.averageCost || '-';
        this.unrealizedGain = init.unrealizedGain || '-';
        this.unrealizedGainSign = init.unrealizedGainSign || '';
        this.realizedGain = init.realizedGain || '-';
        this.realizedGainSign = init.realizedGainSign || '';
        this.currentValue = init.currentValue || '-';
        this.roi = init.roi || '-';
        this.roiSign = init.roiSign || '';
        this.hasData = init.hasData || false;
    }
}
