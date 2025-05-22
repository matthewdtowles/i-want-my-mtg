import { Breadcrumb } from "src/adapters/http/http.types";
import { CardDto } from "src/core/card/api/card.dto";

export function breadcrumbsForCard(card: CardDto): Breadcrumb[] {
    return [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" },
        { label: card.setCode.toUpperCase(), url: `/sets/${card.setCode}` },
        { label: card.name, url: `/cards/${card.setCode}/${card.number}` },
    ];
}