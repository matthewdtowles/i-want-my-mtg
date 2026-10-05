import { EventEmitter } from 'events';
import { getRequestContext, RequestContext } from 'src/logger/request-context';
import { requestLog } from 'src/logger/request-log.middleware';

describe('requestLog', () => {
    function run(
        req: Record<string, unknown>,
        statusCode = 200
    ): { lines: string[]; requestIds: (string | undefined)[] } {
        const lines: string[] = [];
        const requestIds: (string | undefined)[] = [];
        const logger = {
            log: (msg: string) => {
                lines.push(msg);
                requestIds.push(getRequestContext()?.correlationId);
            },
        };
        const res = Object.assign(new EventEmitter(), { statusCode });
        const next = jest.fn();
        RequestContext.run({ correlationId: 'req-1' }, () =>
            requestLog(logger)({ method: 'GET', headers: {}, ...req } as any, res as any, next)
        );
        expect(next).toHaveBeenCalled();
        expect(lines).toHaveLength(0);
        // Emitted outside the request's async context, as Node does for a socket write.
        RequestContext.run({ correlationId: 'other' }, () => res.emit('finish'));
        return { lines, requestIds };
    }

    it('logs method, path, status, duration, client ip and user agent once the response finishes', () => {
        const { lines } = run(
            {
                originalUrl: '/card/eoe/1',
                ip: '198.51.100.7',
                headers: { 'user-agent': 'ExampleBot/2.1 (+https://example.com/bot)' },
            },
            404
        );

        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatch(
            /^GET \/card\/eoe\/1 404 \d+ms ip=198\.51\.100\.7 ua="ExampleBot\/2\.1 \(\+https:\/\/example\.com\/bot\)"$/
        );
    });

    it('drops the query string so tokens in links never reach the logs', () => {
        const { lines } = run({ originalUrl: '/user/verify?token=secret', ip: '198.51.100.7' });

        expect(lines[0]).toMatch(/^GET \/user\/verify 200 /);
        expect(lines[0]).not.toContain('secret');
    });

    it('marks a missing user agent with a dash', () => {
        const { lines } = run({ originalUrl: '/', ip: '198.51.100.7' });

        expect(lines[0]).toMatch(/ ua=-$/);
    });

    it('keeps the request id of the request it describes', () => {
        const { requestIds } = run({ originalUrl: '/', ip: '198.51.100.7' });

        expect(requestIds).toEqual(['req-1']);
    });
});
