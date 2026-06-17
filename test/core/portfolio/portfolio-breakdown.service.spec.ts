import { PortfolioBreakdownService } from 'src/core/portfolio/portfolio-breakdown.service';

describe('PortfolioBreakdownService', () => {
    describe('isDimension', () => {
        it.each(['set', 'rarity', 'type', 'cost-basis', 'color'])(
            'accepts known dimension %s',
            (dimension) => {
                expect(PortfolioBreakdownService.isDimension(dimension)).toBe(true);
            }
        );

        it('rejects unknown / empty values', () => {
            expect(PortfolioBreakdownService.isDimension('format')).toBe(false);
            expect(PortfolioBreakdownService.isDimension('')).toBe(false);
            expect(PortfolioBreakdownService.isDimension(undefined)).toBe(false);
            expect(PortfolioBreakdownService.isDimension(null)).toBe(false);
        });
    });

    describe('parseColors', () => {
        it('returns [] for empty / undefined / null', () => {
            expect(PortfolioBreakdownService.parseColors(undefined)).toEqual([]);
            expect(PortfolioBreakdownService.parseColors(null)).toEqual([]);
            expect(PortfolioBreakdownService.parseColors('')).toEqual([]);
        });

        it('parses comma-separated codes and uppercases them', () => {
            expect(PortfolioBreakdownService.parseColors('w,u')).toEqual(['W', 'U']);
        });

        it('drops unknown codes', () => {
            expect(PortfolioBreakdownService.parseColors('W,X,Z,G')).toEqual(['W', 'G']);
        });

        it('de-dupes while preserving first-seen order', () => {
            expect(PortfolioBreakdownService.parseColors('U,W,W,U')).toEqual(['U', 'W']);
        });

        it('accepts colorless (C)', () => {
            expect(PortfolioBreakdownService.parseColors('C')).toEqual(['C']);
        });

        it('trims surrounding whitespace', () => {
            expect(PortfolioBreakdownService.parseColors(' W , u ')).toEqual(['W', 'U']);
        });
    });
});
