import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { PaginationView } from 'src/http/hbs/list/pagination.view';

describe('PaginationView', () => {
    it('should include filter in pagination link hrefs', () => {
        const options = new SafeQueryOptions({ page: '1', limit: '25', filter: 'bolt' });
        const view = new PaginationView(options, '/transactions', 100);

        expect(view.next?.href).toContain('filter=bolt');
        expect(view.last?.href).toContain('filter=bolt');
    });

    it('should build correct page links without filter', () => {
        const options = new SafeQueryOptions({ page: '2', limit: '25' });
        const view = new PaginationView(options, '/transactions', 100);

        expect(view.previous?.href).toContain('page=1');
        expect(view.next?.href).toContain('page=3');
        expect(view.current).toBe(2);
    });

    it('should calculate totalPages correctly', () => {
        const options = new SafeQueryOptions({ page: '1', limit: '25' });
        const view = new PaginationView(options, '/test', 75);

        expect(view.totalPages).toBe(3);
    });
});
