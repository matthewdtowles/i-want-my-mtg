import { toDollar } from "src/http/http.util";

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