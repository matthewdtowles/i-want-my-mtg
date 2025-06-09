export class AggregatorService implements AggregatorService {
    // async findInventorySetByCode(setCode: string, userId: number): Promise<InventorySetAggregateDto> {
    //     this.LOGGER.debug(`findInventorySetByCode for set: ${setCode}, user: ${userId}`);
    //     const set: SetDto = await this.setService.findByCode(setCode);
    //     if (!set) throw new Error(`Set with code ${setCode} not found`);
    //     if (!set.cards || set.cards.length === 0) throw new Error(`Set with code ${setCode} has no cards`);
    //     const invCards: InventoryDto[] = await this.inventoryService.findAllCardsForUser(userId);
    //     const setInvCards: InventoryDto[] = invCards ? invCards.filter(item => item.card.setCode === setCode) : [];
    //     const updatedSetCards: InventoryCardAggregateDto[] = set.cards.map(card => {
    //         const invItems: InventoryDto[] = setInvCards.filter(inv => inv.card.order === card.order);
    //         return this.mapInventoryCardAggregate(card, invItems);
    //     });
    //     return {
    //         ...set,
    //         cards: updatedSetCards,
    //     };
    // }

    // private mapInventoryCardAggregate(
    //     card: CardDto,
    //     inventoryItems: InventoryDto[] | InventoryDto[]
    // ): InventoryCardAggregateDto {
    //     const variants: InventoryCardVariant[] = [];
    //     if (card.hasNonFoil) {
    //         const inv: InventoryDto = inventoryItems.find(item => !item.isFoil);
    //         variants.push({
    //             displayValue: toDollar(card.prices[0]?.normal),
    //             quantity: inv ? inv.quantity : 0,
    //             isFoil: false
    //         });
    //     }
    //     if (card.hasFoil) {
    //         const inv: InventoryDto = inventoryItems.find(item => item.isFoil);
    //         variants.push({
    //             displayValue: toDollar(card.prices[0]?.foil),
    //             quantity: inv ? inv.quantity : 0,
    //             isFoil: true
    //         });
    //     }
    //     return {
    //         ...card,
    //         variants,
    //     };
}
