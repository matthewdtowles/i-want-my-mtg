import { SetPrice } from 'src/core/set/set-price.entity';
import { toDollar } from 'src/http/base/http.util';
import { SetPriceDto } from './dto/set-price.dto';

export class SetPresenter {
    /**
     * Creates a SetPriceDto with proper price filtering and deduplication.
     * Handles prices that may be strings or numbers from the database.
     * Filters out zero values and duplicate prices across categories.
     */
    static toSetPriceDto(prices: SetPrice | null | undefined): SetPriceDto {
        const setPrice: SetPrice = prices ?? new SetPrice({});

        // Helper to safely convert to number and check if valid price
        const toValidNumber = (value: unknown): number | null => {
            if (value === null || value === undefined) return null;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return !isNaN(num) && num > 0 ? num : null;
        };

        // Convert all prices to numbers or null
        const basePrice = toValidNumber(setPrice.basePrice);
        const basePriceAll = toValidNumber(setPrice.basePriceAll);
        const totalPrice = toValidNumber(setPrice.totalPrice);
        const totalPriceAll = toValidNumber(setPrice.totalPriceAll);

        let defaultPrice = '-';
        let defaultChange: number | null = null;
        let gridCols = 0;

        // Helper to convert change value to number or null
        const toChangeNumber = (value: unknown): number | null => {
            if (value === null || value === undefined) return null;
            const num = typeof value === 'string' ? parseFloat(value) : Number(value);
            return isNaN(num) ? null : num;
        };

        // Filter and deduplicate prices in priority order (reverse of display)
        const totalPriceAllFiltered =
            totalPriceAll && totalPriceAll !== totalPrice && totalPriceAll !== basePriceAll
                ? toDollar(totalPriceAll)
                : null;
        if (totalPriceAllFiltered) {
            gridCols++;
            defaultPrice = totalPriceAllFiltered;
            defaultChange = toChangeNumber(setPrice.totalPriceAllChangeWeekly);
        }

        const totalPriceNormalFiltered =
            totalPrice && totalPrice !== basePrice ? toDollar(totalPrice) : null;
        if (totalPriceNormalFiltered) {
            gridCols++;
            defaultPrice = totalPriceNormalFiltered;
            defaultChange = toChangeNumber(setPrice.totalPriceChangeWeekly);
        }

        const basePriceAllFiltered =
            basePriceAll && basePriceAll !== basePrice ? toDollar(basePriceAll) : null;
        if (basePriceAllFiltered) {
            gridCols++;
            defaultPrice = basePriceAllFiltered;
            defaultChange = toChangeNumber(setPrice.basePriceAllChangeWeekly);
        }

        const basePriceNormalFiltered = basePrice ? toDollar(basePrice) : null;
        if (basePriceNormalFiltered) {
            gridCols++;
            defaultPrice = basePriceNormalFiltered;
            defaultChange = toChangeNumber(setPrice.basePriceChangeWeekly);
        }

        // Helper to format a change value into display string + sign
        const formatChange = (value: unknown): { changeWeekly: string; changeWeeklySign: string } => {
            const num = toChangeNumber(value);
            if (num === null) return { changeWeekly: '', changeWeeklySign: '' };
            if (num === 0) return { changeWeekly: '$0.00', changeWeeklySign: 'neutral' };
            const formatted = toDollar(Math.abs(num));
            return num > 0
                ? { changeWeekly: `+${formatted}`, changeWeeklySign: 'positive' }
                : { changeWeekly: `-${formatted}`, changeWeeklySign: 'negative' };
        };

        const defaultFormatted = formatChange(defaultChange);
        const basePriceNormalChange = basePriceNormalFiltered
            ? formatChange(setPrice.basePriceChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const basePriceAllChange = basePriceAllFiltered
            ? formatChange(setPrice.basePriceAllChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const totalPriceNormalChange = totalPriceNormalFiltered
            ? formatChange(setPrice.totalPriceChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };
        const totalPriceAllChange = totalPriceAllFiltered
            ? formatChange(setPrice.totalPriceAllChangeWeekly)
            : { changeWeekly: '', changeWeeklySign: '' };

        return new SetPriceDto({
            gridCols,
            defaultPrice,
            basePriceNormal: basePriceNormalFiltered,
            basePriceAll: basePriceAllFiltered,
            totalPriceNormal: totalPriceNormalFiltered,
            totalPriceAll: totalPriceAllFiltered,
            defaultPriceChangeWeekly: defaultFormatted.changeWeekly,
            defaultPriceChangeWeeklySign: defaultFormatted.changeWeeklySign,
            basePriceNormalChangeWeekly: basePriceNormalChange.changeWeekly,
            basePriceNormalChangeWeeklySign: basePriceNormalChange.changeWeeklySign,
            basePriceAllChangeWeekly: basePriceAllChange.changeWeekly,
            basePriceAllChangeWeeklySign: basePriceAllChange.changeWeeklySign,
            totalPriceNormalChangeWeekly: totalPriceNormalChange.changeWeekly,
            totalPriceNormalChangeWeeklySign: totalPriceNormalChange.changeWeeklySign,
            totalPriceAllChangeWeekly: totalPriceAllChange.changeWeekly,
            totalPriceAllChangeWeeklySign: totalPriceAllChange.changeWeeklySign,
            lastUpdate: setPrice.lastUpdate,
        });
    }
}
