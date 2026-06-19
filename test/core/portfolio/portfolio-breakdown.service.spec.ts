import { PortfolioBreakdownService } from 'src/core/portfolio/portfolio-breakdown.service';
import { PortfolioBreakdownCard } from 'src/core/portfolio/portfolio-breakdown.entity';

describe('PortfolioBreakdownService', () => {
    describe('listSliceCards', () => {
        const makeService = (listCards = jest.fn()) => {
            const repo = { aggregate: jest.fn(), listCards } as any;
            return { service: new PortfolioBreakdownService(repo), repo };
        };

        it('returns [] without hitting the repository when key is empty', async () => {
            const { service, repo } = makeService();
            await expect(service.listSliceCards(1, 'set', '')).resolves.toEqual([]);
            expect(repo.listCards).not.toHaveBeenCalled();
        });

        it('delegates to the repository with the selected colors', async () => {
            const cards = [new PortfolioBreakdownCard({ cardId: 'c1', name: 'Card 1' })];
            const { service, repo } = makeService(jest.fn().mockResolvedValue(cards));
            const result = await service.listSliceCards(7, 'color', 'U', ['U', 'W']);
            expect(result).toBe(cards);
            expect(repo.listCards).toHaveBeenCalledWith(7, 'color', 'U', ['U', 'W']);
        });

        it('defaults selectedColors to []', async () => {
            const { service, repo } = makeService(jest.fn().mockResolvedValue([]));
            await service.listSliceCards(2, 'rarity', 'mythic');
            expect(repo.listCards).toHaveBeenCalledWith(2, 'rarity', 'mythic', []);
        });
    });

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
