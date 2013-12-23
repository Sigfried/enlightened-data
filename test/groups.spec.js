'use strict()';

/* global: describe */
describe('Groups', function() {
    var self = this;

    beforeEach(function() {
        self.groups = enlightenedData.addGroupMethods([]);
    });

    it('should apply Groups methods to arrays', function() {
        expect(self.groups.asRootVal).toBeDefined();
        expect(self.groups.rawValues).toBeDefined();
        expect(self.groups.lookup).toBeDefined();
        expect(self.groups.singleLookup).toBeDefined();
        expect(self.groups.flattenTree).toBeDefined();
    });

    describe('asRootVal', function() {
        it('should set its dimension as "root"', function() {
            var root = self.groups.asRootVal();
            expect(root.dim).toBe('root');
        });

        it('should assign its records to the current group', function() {
            var root = self.groups.asRootVal();
            expect(root.records).toEqual(self.groups);

            var groups = enlightenedData.addGroupMethods([1, 2, true, 'herp']);
            root = groups.asRootVal();
            expect(root.records).toEqual(groups);
        });

        xit('should set its name to a provided value, or "Root"', function() {
            /** @todo not at all sure how this works yet */
        });
    });

    describe('rawValues', function() {
        function get_raw(array) {
            var groups = enlightenedData.addGroupMethods(array);
            return groups.rawValues();
        }

        it('should do nothing for empty arrays', function() {
            expect(get_raw([])).toEqual([]);
        });

        it('should do nothing for string arrays', function() {
            expect(get_raw(['one', 'two'])).toEqual(['one', 'two']);
        });

        it('should turn numeric types into strings', function() {
            expect(get_raw([1, 2])).toEqual(['1', '2']);
        });

        it('should turn boolean types into strings', function() {
            expect(get_raw([true, false])).toEqual(['true', 'false']);
        });
    });
    describe('underscoreMethods', function() {
        //var arr;
        function addMethods(array) {
            var groups = enlightenedData.addGroupMethods(array);
            return groups;
        }
        /*
        beforeEach(function() {
            arr = addMethods([1,2,3]);
            _(enlightenedData.underscoreMethods).each(function(method) {
                spyOn(arr, method);
                arr[method]();
            })
        })
        */
        it('should add all the methods', function() {
            var arr = addMethods([1,2,3]);
            _(enlightenedData.underscoreMethods).each(function(method) {
                expect(typeof arr[method]).toEqual("function");
            });
        });
    });
});
