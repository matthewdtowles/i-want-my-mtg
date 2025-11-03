import { completionRate, toDollar } from "src/http/base/http.util";

describe("toDollar", () => {
    it("should handle numbers less than 1 correctly", () => {
        expect(toDollar(0.5)).toBe("$0.50");
    });

    it("should handle whole numbers correctly", () => {
        expect(toDollar(1000)).toBe("$1,000.00");
    });

    it("should handle negative numbers correctly", () => {
        expect(toDollar(-1234.56)).toBe("$-1,234.56");
    });

    it("should handle zero correctly", () => {
        expect(toDollar(0)).toBe("-");
    });

    it("should handle null and undefined values correctly", () => {
        expect(toDollar(null)).toBe("-");
        expect(toDollar(undefined)).toBe("-");
    });

    it("should handle more than 2 decimals correctly", () => {
        expect(toDollar(90.12345)).toBe("$90.13");
    });

    it("should handle multi-comma large numbers correctly", () => {
        expect(toDollar(1234567890)).toBe("$1,234,567,890.00");
    });

    it("should handle small numbers correctly", () => {
        expect(toDollar(0.0001)).toBe("$0.01");
    });
});

describe("completionRate", () => {
    it("should return 0 if total owned is 0", () => {
        expect(completionRate(0, 100)).toBe(0);
    });

    it("should return 0 if total owned is less than 0", () => {
        expect(completionRate(-1, 100)).toBe(0);
    });

    it("should return 0 if total cards in set is 0", () => {
        expect(completionRate(1, 0)).toBe(0);
    });

    it("should return 0 if total cards in set is less than 0", () => {
        expect(completionRate(1, -1)).toBe(0);
    });

    it("should return 100 if total owned is equal to total in set", () => {
        expect(completionRate(350, 350)).toBe(100);
    });

    it("should return 100 if total owned is greater than total in set", () => {
        expect(completionRate(500, 350)).toBe(100);
    });

    it("should return completion rate to nearest two decimals", () => {
        expect(completionRate(349, 350)).toBe(99.71);
    });
});