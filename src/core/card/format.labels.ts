import { Format } from './format.enum';

export const FORMAT_LABELS: Record<string, string> = {
    [Format.Standard]: 'Standard',
    [Format.Commander]: 'Commander',
    [Format.Modern]: 'Modern',
    [Format.Legacy]: 'Legacy',
    [Format.Vintage]: 'Vintage',
    [Format.Brawl]: 'Brawl',
    [Format.Explorer]: 'Explorer',
    [Format.Historic]: 'Historic',
    [Format.Oathbreaker]: 'Oathbreaker',
    [Format.Pauper]: 'Pauper',
    [Format.Pioneer]: 'Pioneer',
};

export function labelFormat(format: Format | null | undefined): string {
    return format ? FORMAT_LABELS[format] ?? format : 'Freestyle';
}
