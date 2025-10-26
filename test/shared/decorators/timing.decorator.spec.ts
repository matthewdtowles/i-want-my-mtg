import { AppLogger } from "src/logger/app-logger";
import { Timing } from "src/shared/decorators/timing.decorator";


describe("Timing Decorator", () => {
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
        loggerSpy = jest.spyOn(AppLogger.prototype, "log").mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete process.env.TIMING_ENABLED;
    });

    it("should not log the execution time when undefined", async () => {
        process.env.TIMING_ENABLED = undefined;
        class MockClass {
            @Timing()
            async mockMethod(): Promise<string> {
                await new Promise(resolve => setTimeout(resolve, 100));
                return "done";
            }
        }
        const mockInstance: MockClass = new MockClass();
        const result = await mockInstance.mockMethod();

        expect(result).toBe("done");
        expect(loggerSpy).not.toHaveBeenCalled();
    });

    it("should log the execution time and call the original method when enabled", async () => {
        process.env.TIMING_ENABLED = "true";
        class MockClass {
            @Timing()
            async mockMethod(): Promise<string> {
                await new Promise(resolve => setTimeout(resolve, 100));
                return "done";
            }
        }
        const mockInstance: MockClass = new MockClass();
        const result = await mockInstance.mockMethod();

        expect(result).toBe("done");
        expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

});