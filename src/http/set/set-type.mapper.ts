import { Set as CardSet } from "src/core/set/set.entity";

const BONUS_SET_TYPES = new Set<string>([
    "promo",
    "arsenal",
    "commander",
    "duel_deck",
    "from_the_vault",
    "planechase",
    "spellbook",
    "box",
    "eternal",
    "archenemy",
    "premium_deck",
]);

export class SetTypeMapper {
    static mapSetTypeToTags(set: CardSet): string[] {
        const tags: string[] = [];
        const setType = set.type;
        if (BONUS_SET_TYPES.has(setType.toLowerCase())) {
            const normalizedType = setType.toLowerCase().replace(/_/g, " ");
            const displayTag = normalizedType
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            tags.push(displayTag);
        }
        else if (set.baseSize === 0) {
            tags.push("Bonus");
        }
        return tags;
    }
}