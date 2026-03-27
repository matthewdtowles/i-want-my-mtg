import { Breadcrumb } from './breadcrumb';

interface CardJsonLdInput {
    name: string;
    imgSrc?: string;
    oracleText?: string;
    setName?: string;
    normalPriceRaw?: number;
}

export function buildBreadcrumbJsonLd(appUrl: string, breadcrumbs: Breadcrumb[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.label,
            item: `${appUrl}${crumb.url}`,
        })),
    };
}

export function buildCardJsonLd(appUrl: string, card: CardJsonLdInput, url: string): object {
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: card.name,
        brand: {
            '@type': 'Brand',
            name: 'Magic: The Gathering',
        },
    };
    if (card.imgSrc) {
        schema.image = card.imgSrc;
    }
    if (card.oracleText) {
        schema.description = card.oracleText;
    }
    if (card.setName) {
        schema.category = card.setName;
    }
    schema.url = `${appUrl}${url}`;
    if (card.normalPriceRaw && card.normalPriceRaw > 0) {
        schema.offers = {
            '@type': 'Offer',
            price: card.normalPriceRaw.toFixed(2),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
        };
    }
    return schema;
}

export function buildJsonLd(...schemas: object[]): string {
    if (schemas.length === 1) {
        return JSON.stringify(schemas[0]);
    }
    return JSON.stringify(schemas);
}
