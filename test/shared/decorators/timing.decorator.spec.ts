import { Timing } from "src/shared/decorators/timing.decorator";

class MockClass {
    @Timing()
    async mockMethod(): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 100));
        return "done";
    }
}

describe("Timing Decorator", () => {
    let mockInstance: MockClass;
    beforeEach(() => {
        mockInstance = new MockClass();
        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should log the execution time and call the original method", async () => {
        const result = await mockInstance.mockMethod();

        expect(result).toBe("done");
        expect(console.log).toHaveBeenCalledWith("[mockMethod] Execution started...");
        expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\[mockMethod\] Execution finished\. Time taken: \d+ms/));
    });
});