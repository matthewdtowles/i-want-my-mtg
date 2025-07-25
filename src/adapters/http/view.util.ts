export const BASE_IMAGE_URL: string = "https://cards.scryfall.io";

export function toDollar(amount: number): string {
    let dollarAmount: string = "-";
    if (amount) {
        const roundedNumber = Math.ceil(amount * 100) / 100;
        dollarAmount = roundedNumber.toFixed(2);
        dollarAmount = "$" + dollarAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return dollarAmount;
}