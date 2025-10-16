import { SortOptions } from "src/core/query/sort-options.enum";
import { isEnumValue, validateInit } from "src/core/validation.util";

describe("validateInit", () => {

    type TestType = { a: number; b: string; }

    it("should not throw when all required fields are present", () => {
        expect(() => validateInit(
            { a: 1, b: "test", c: true, d: "unrequired value" } as TestType,
            ["a", "b"]
        )).not.toThrow();
    });

    it("should throw when a required field is missing", () => {
        expect(() => validateInit(
            { a: 1 } as TestType,
            ["a", "b"]
        )).toThrow(/b is required/);
    });

    it("should throw when a required field is null", () => {
        expect(() => validateInit(
            { a: 1, b: null } as TestType,
            ["a", "b"]
        )).toThrow(/b is required/);
    });

    it("should throw when a required field is undefined", () => {
        expect(() => validateInit(
            { a: 1, b: undefined } as TestType,
            ["a", "b"]
        )).toThrow(/b is required/);
    });
});

describe("isEnumValue", () => {
    it("should return true for a valid enum value", () => {
        expect(isEnumValue(SortOptions, "name")).toBe(true);
        expect(isEnumValue(SortOptions, "number")).toBe(true);
    });

    it("should return false for null", () => {
        expect(isEnumValue(SortOptions, null)).toBe(false);
    });

    it("should return false for undefined", () => {
        expect(isEnumValue(SortOptions, undefined)).toBe(false);
    });

    it("should return false for a number not in enum", () => {
        expect(isEnumValue(SortOptions, 123)).toBe(false);
    });

    it("should return false for a boolean", () => {
        expect(isEnumValue(SortOptions, true)).toBe(false);
        expect(isEnumValue(SortOptions, false)).toBe(false);
    });

    it("should return false for a string not in enum", () => {
        expect(isEnumValue(SortOptions, "not-an-enum-value")).toBe(false);
    });
});