/**
 * @jest-environment jsdom
 */

if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

beforeEach(function () {
    delete window.SetListUtils;
    jest.resetModules();
});

function loadSetListUtils() {
    require('../../src/http/public/js/setListUtils.js');
    return window.SetListUtils;
}

describe('SetListUtils.groupByBlock', function () {
    it('should group sets by parentCode', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, releaseDate: '2021-09-24' },
            { code: 'mic', name: 'Midnight Hunt Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, releaseDate: '2021-09-24' },
        ];
        var multiSetKeys = { mid: true };

        var groups = utils.groupByBlock(sets, multiSetKeys);

        expect(groups).toHaveLength(1);
        expect(groups[0].blockName).toBe('Innistrad');
        expect(groups[0].sets).toHaveLength(2);
        expect(groups[0].isMultiSet).toBe(true);
    });

    it('should keep standalone sets as single-set groups', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'neo', name: 'Kamigawa: Neon Dynasty', block: 'Kamigawa', parentCode: null, isMain: true, releaseDate: '2022-02-18' },
        ];

        var groups = utils.groupByBlock(sets, {});

        expect(groups).toHaveLength(1);
        expect(groups[0].blockName).toBe('Kamigawa');
        expect(groups[0].sets).toHaveLength(1);
        expect(groups[0].isMultiSet).toBe(false);
    });

    it('should mark single-set groups as multi-set when in multiSetKeys', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'mic', name: 'Midnight Hunt Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, releaseDate: '2021-09-24' },
        ];
        var multiSetKeys = { mid: true };

        var groups = utils.groupByBlock(sets, multiSetKeys);

        expect(groups).toHaveLength(1);
        expect(groups[0].isMultiSet).toBe(true);
    });

    it('should sort sets within a group: main first, then by releaseDate ASC', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'mic', name: 'Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, releaseDate: '2021-09-24' },
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, releaseDate: '2021-09-24' },
            { code: 'mia', name: 'Midnight Alchemy', block: 'Innistrad', parentCode: 'mid', isMain: false, releaseDate: '2021-12-09' },
        ];
        var multiSetKeys = { mid: true };

        var groups = utils.groupByBlock(sets, multiSetKeys);

        expect(groups[0].sets[0].code).toBe('mid');
        expect(groups[0].sets[1].code).toBe('mic');
        expect(groups[0].sets[2].code).toBe('mia');
    });

    it('should sort groups by earliest release date DESC', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, releaseDate: '2021-09-24' },
            { code: 'neo', name: 'Neon Dynasty', block: 'Kamigawa', parentCode: null, isMain: true, releaseDate: '2022-02-18' },
        ];

        var groups = utils.groupByBlock(sets, {});

        expect(groups[0].blockName).toBe('Kamigawa');
        expect(groups[1].blockName).toBe('Innistrad');
    });

    it('should use set name as blockName when block field is missing', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'abc', name: 'Mystery Set', block: null, parentCode: null, isMain: true, releaseDate: '2023-01-01' },
        ];

        var groups = utils.groupByBlock(sets, {});

        expect(groups[0].blockName).toBe('Mystery Set');
    });

    it('should handle empty sets array', function () {
        var utils = loadSetListUtils();
        var groups = utils.groupByBlock([], {});
        expect(groups).toEqual([]);
    });

    it('should group multiple blocks correctly', function () {
        var utils = loadSetListUtils();
        var sets = [
            { code: 'mid', name: 'Midnight Hunt', block: 'Innistrad', parentCode: null, isMain: true, releaseDate: '2021-09-24' },
            { code: 'mic', name: 'MH Commander', block: 'Innistrad', parentCode: 'mid', isMain: false, releaseDate: '2021-09-24' },
            { code: 'neo', name: 'Neon Dynasty', block: 'Kamigawa', parentCode: null, isMain: true, releaseDate: '2022-02-18' },
            { code: 'nec', name: 'ND Commander', block: 'Kamigawa', parentCode: 'neo', isMain: false, releaseDate: '2022-02-18' },
        ];
        var multiSetKeys = { mid: true, neo: true };

        var groups = utils.groupByBlock(sets, multiSetKeys);

        expect(groups).toHaveLength(2);
        expect(groups[0].blockName).toBe('Kamigawa');
        expect(groups[0].sets).toHaveLength(2);
        expect(groups[1].blockName).toBe('Innistrad');
        expect(groups[1].sets).toHaveLength(2);
    });
});
