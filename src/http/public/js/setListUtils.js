/**
 * Shared utilities for set list rendering.
 * Groups sets by block (parentCode) for block-grouped display.
 */
var SetListUtils = (function () {
    /**
     * Group a flat array of sets into block groups.
     * Mirrors the server-side SetOrchestrator.groupSetsByBlock() logic.
     *
     * @param {Array} sets - Flat array of set objects with code, parentCode, block, isMain, releaseDate
     * @param {Object} multiSetKeys - Hash of block keys known to have multiple sets { blockKey: true }
     * @returns {Array} Array of { blockName, sets, isMultiSet } sorted by release date DESC
     */
    function groupByBlock(sets, multiSetKeys) {
        if (!sets || sets.length === 0) return [];

        var blockMap = {};
        var blockOrder = [];

        for (var i = 0; i < sets.length; i++) {
            var set = sets[i];
            var key = set.parentCode || set.code;
            if (!blockMap[key]) {
                blockMap[key] = [];
                blockOrder.push(key);
            }
            blockMap[key].push(set);
        }

        var groups = [];
        for (var j = 0; j < blockOrder.length; j++) {
            var k = blockOrder[j];
            var blockSets = blockMap[k];

            blockSets.sort(function (a, b) {
                if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
                return (a.releaseDate || '').localeCompare(b.releaseDate || '');
            });

            var blockName = blockSets[0].block || blockSets[0].name;
            groups.push({
                blockName: blockName,
                sets: blockSets,
                isMultiSet: blockSets.length > 1 || !!multiSetKeys[k],
            });
        }

        groups.sort(function (a, b) {
            var aDate = a.sets[0].releaseDate || '';
            var bDate = b.sets[0].releaseDate || '';
            return bDate.localeCompare(aDate);
        });

        return groups;
    }

    return {
        groupByBlock: groupByBlock,
    };
})();

if (typeof window !== 'undefined') {
    window.SetListUtils = SetListUtils;
}
