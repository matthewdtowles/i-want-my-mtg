import { Breadcrumb } from "src/adapters/http/breadcrumb";

export function breadcrumbsForCard(setCode: string, cardName: string, cardNumber: string): Breadcrumb[] {
    return [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" },
        { label: setCode.toUpperCase(), url: `/sets/${setCode}` },
        { label: cardName, url: `/cards/${setCode}/${cardNumber}` },
    ];
}