import { Card } from 'src/core/card/card.entity';
import { CardImgType } from 'src/core/card/card.img.type.enum';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Format } from 'src/core/card/format.enum';
import { Price } from 'src/core/card/price.entity';
import { formatUtcDate } from 'src/http/base/date.util';
import { BASE_IMAGE_URL, buildCardUrl, toDollar } from 'src/http/base/http.util';
import { InventoryQuantities } from 'src/http/hbs/inventory/inventory.quantities';
import { CardResponseDto, ManaToken } from './dto/card.response.dto';
import { LegalityResponseDto } from './dto/legality.response.dto';
import { SingleCardResponseDto } from './dto/single-card.response.dto';

export interface PriceHistoryPoint {
    date: string;
    normal: number | null;
    foil: number | null;
}

export class CardPresenter {
    static toPriceHistoryPoint(p: Price): PriceHistoryPoint {
        return {
            date: formatUtcDate(p.date),
            normal: p.normal != null ? Number(p.normal) : null,
            foil: p.foil != null ? Number(p.foil) : null,
        };
    }

    static toCardResponse(
        card: Card,
        inventory: InventoryQuantities,
        imageType: CardImgType = CardImgType.SMALL
    ): CardResponseDto {
        if (!card) {
            throw new Error('Card is required to create CardResponseDto');
        }
        const price: Price | undefined = card.prices ? card.prices[0] : undefined;
        return new CardResponseDto({
            cardId: card.id,
            hasFoil: card.hasFoil,
            hasNormal: card.hasNonFoil,
            imgSrc: this.buildImgSrc(card, imageType),
            manaCost: this.manaForView(card.manaCost),
            name: card.name,
            number: card.number,
            rarity: this.convertToCardRarity(card.rarity).toLowerCase(),
            setCode: card.setCode,
            type: card.type,
            url: this.buildCardUrl(card),
            foilPrice: toDollar(price?.foil),
            foilQuantity: card.hasFoil && inventory?.foilQuantity ? inventory.foilQuantity : 0,
            normalPrice: toDollar(price?.normal),
            normalQuantity:
                card.hasNonFoil && inventory?.normalQuantity ? inventory.normalQuantity : 0,
            normalPriceRaw: price?.normal ? Math.round(price.normal * 100) / 100 : 0,
            foilPriceRaw: price?.foil ? Math.round(price.foil * 100) / 100 : 0,
            ...this.formatPriceChange(price),
            tags: this.createTags(card),
        });
    }

    static toSingleCardResponse(
        card: Card,
        inventory: InventoryQuantities,
        imageType: CardImgType
    ): SingleCardResponseDto {
        return new SingleCardResponseDto({
            ...this.toCardResponse(card, inventory, imageType),
            legalities: this.fillMissingFormats(card),
            artist: card.artist,
            oracleText: card.oracleText || '',
            setName: card.set?.name || '',
        });
    }

    static createTags(card: Card): string[] {
        const tags = [];
        if (card.isReserved) tags.push('Reserved');
        if (!card.inMain) tags.push('Bonus');
        return tags;
    }

    private static fillMissingFormats(card: Card): LegalityResponseDto[] {
        const existingLegalities: LegalityResponseDto[] = card.legalities || [];
        const formats = Object.values(Format) as Format[];
        return formats.map((format) => {
            const existing = existingLegalities.find((l) => l.format === format);
            return (
                existing ??
                new LegalityResponseDto({
                    cardId: card.id,
                    format,
                    status: 'Not Legal',
                })
            );
        });
    }

    private static manaForView(manaCost?: string): Array<ManaToken> {
        if (!manaCost || typeof manaCost !== 'string') {
            return [];
        }
        const raw = manaCost.trim();
        if (raw === '') return [];
        const faceParts = raw.split(' // ');
        const tokens: Array<ManaToken> = [];
        for (let i = 0; i < faceParts.length; ++i) {
            const part = faceParts[i].trim();
            const matches = Array.from(part.matchAll(/\{([^}]+)\}/g)).map((m) => m[1]);
            for (const sym of matches) {
                if (sym.startsWith('h')) {
                    tokens.push({ symbol: sym.substring(1), isHalf: true });
                } else {
                    tokens.push({ symbol: sym });
                }
            }
            if (i + 1 < faceParts.length) {
                tokens.push({ sep: ' // ' });
            }
        }
        return tokens;
    }

    private static buildCardUrl(card: Card): string {
        return buildCardUrl(card.setCode, card.number);
    }

    private static buildImgSrc(card: Card, size: CardImgType): string {
        return `${BASE_IMAGE_URL}/${size}/front/${card.imgSrc}`;
    }

    static formatPriceChange(price?: Price): {
        priceChangeWeekly: string;
        priceChangeWeeklySign: string;
        foilPriceChangeWeekly: string;
        foilPriceChangeWeeklySign: string;
    } {
        return {
            ...this.formatChange(price?.normalChangeWeekly ?? price?.foilChangeWeekly),
            ...this.formatFoilChange(price?.foilChangeWeekly),
        };
    }

    private static formatChange(change: number | null | undefined): {
        priceChangeWeekly: string;
        priceChangeWeeklySign: string;
    } {
        const result = this.formatChangeValue(change);
        return { priceChangeWeekly: result.value, priceChangeWeeklySign: result.sign };
    }

    private static formatFoilChange(change: number | null | undefined): {
        foilPriceChangeWeekly: string;
        foilPriceChangeWeeklySign: string;
    } {
        const result = this.formatChangeValue(change);
        return { foilPriceChangeWeekly: result.value, foilPriceChangeWeeklySign: result.sign };
    }

    private static formatChangeValue(change: number | null | undefined): {
        value: string;
        sign: string;
    } {
        if (change === null || change === undefined) {
            return { value: '', sign: '' };
        }
        const num = typeof change === 'string' ? parseFloat(change) : Number(change);
        if (isNaN(num) || num === 0) {
            return { value: '$0.00', sign: 'neutral' };
        }
        const abs = Math.abs(Math.round(num * 100) / 100);
        const formatted = '$' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (num > 0) {
            return { value: `+${formatted}`, sign: 'positive' };
        }
        return { value: `-${formatted}`, sign: 'negative' };
    }

    private static convertToCardRarity(rarity: string): CardRarity {
        if (Object.values(CardRarity).includes(rarity as CardRarity)) {
            return rarity as CardRarity;
        }
        throw new Error(`Invalid rarity value: ${rarity}`);
    }
}
