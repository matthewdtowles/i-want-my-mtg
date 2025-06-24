import { Breadcrumb } from "src/adapters/http/breadcrumb";
import { SingleCardResponseDto } from "src/adapters/http/card/dto/single-card.response.dto";

export function breadcrumbsForCard(singleCard: SingleCardResponseDto): Breadcrumb[] {
    return [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" },
        { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
        { label: singleCard.name, url: `/cards/${singleCard.setCode}/${singleCard.number}` },
    ];
}