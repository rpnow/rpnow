/* global describe it expect */
const normalize = require('../src/server/normalize-json');

describe("normalize-json", () => {

    it('should reject non-objects', () => {
        let schema = {
            'field': [ String, 10 ]
        }
        function reject(obj) {
            expect( normalize(obj, schema).valid ).toBe(false);
        }

        reject(undefined);
        reject(null);
        reject(0);
        reject(1);
        reject(true);
        reject(false);
        reject('just a string');
        reject('');
        reject([]);
        reject(function(){});
    })

    it('should require all fields', () => {
        let schema = {
            'first': [ String, 10 ],
            'second': [ {$optional:String}, 10]
        }
        expect(
            normalize({'first': 'here', 'second': 'here'}, schema).valid
        ).toBe(true);
        expect(
            normalize({'first': 'here'}, schema).valid
        ).toBe(true);

        expect(
            normalize({}, schema).valid
        ).toBe(false);
        expect(
            normalize({'second':'here'}, schema).valid
        ).toBe(false);

    });

    it('should strip undefined values from fields not in the schema', () => {
        let schema = {
            first: [String, 100]
        };
        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(
            normalize(obj, schema).valid
        ).toBe(true);
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should strip undefined values from $optional fields', () => {
        let schema = {
            first: [ String, 100 ],
            second: [ {$optional:String}, 100 ]
        };
        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(
            normalize(obj, schema).valid
        ).toBe(true);
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should strip undefined values from fields resolved as undefined', () => {
        let schema = {
            first: [ String, 100 ],
            second: () => undefined
        }
        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(
            normalize(obj, schema).valid
        ).toBe(true);
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should reject unexpected fields', () => {
        let schema = {
            'good': [ String, 10 ]
        }
        expect(
            normalize({'good': 'present', 'extra': 'also here'}, schema).valid
        ).toBe(false);
    });

    it('should validate strings with a maximum length', () => {
        let schema = {
            'someString': [ String, 10 ]
        }
        function checkString(str, expectedResult) {
            expect( normalize({'someString': str}, schema).valid )
                .toBe(expectedResult);
        }
        checkString('hello', true);
        checkString('a', true);
        checkString('undefined', true);
        checkString('null', true);
        checkString('true', true);
        checkString('false', true);
        checkString('0', true);
        checkString('1', true);
        checkString('10 letters', true);
        checkString('unicode ♥', true);
        checkString('©️©️©️©️©️', true);
        checkString('♥️♥️♥️♥️♥️', true);
        checkString('😂😂😂😂😂', true);

        checkString(undefined, false);
        checkString(null, false);
        checkString(true, false);
        checkString(false, false);
        checkString(0, false);
        checkString(1, false);
        checkString(999, false);
        checkString(9.9, false);
        checkString([], false);
        checkString({}, false);
        checkString('', false);
        checkString('elevenchars', false);
        checkString('unicode✖️✖️', false);
        checkString('very very very very very very very long string', false);
    });

    it('should validate Optional strings too', () => {
        let schema = {
            'someString': [ {$optional:String}, 10 ]
        }
        function checkString(str, expectedResult) {
            expect( normalize({'someString': str}, schema).valid )
                .toBe(expectedResult);
        }

        checkString('a string', true);
        checkString(undefined, true);
        checkString('', true);
        checkString('null', true);
        checkString('0', true);
        checkString('false', true);

        checkString(null, false);
        checkString(0, false);
        checkString(false, false);
        checkString([], false);
        checkString({}, false);
        checkString('still too long', false);
    });

    it('should validate numbers', () => {
        let schema = {
            'someNumber': [ Number ]
        };
        function check(num, expectedResult) {
            expect( normalize({'someNumber': num}, schema).valid )
                .toBe(expectedResult);
        }

        check(0, true);
        check(1, true);
        check(0.00001, true);
        check(9999999999, true);
        check(-1, true);

        check(Infinity, false);
        check(-Infinity, false);
        check(NaN, false);
        check('0', false);
        check('1', false);
        check(true, false);
        check(false, false);
        check(undefined, false);
        check(null, false);
        check([], false);
        check({}, false);
        check(function(){}, false);
    });

    it('should validate integers', () => {
        let schema = {
            'someInt': [ Number.isInteger ]
        }
        function check(num, expectedResult) {
            expect( normalize({'someInt': num}, schema).valid )
                .toBe(expectedResult);
        }

        check(0, true);
        check(1, true);
        check(-1, true);
        check(Math.pow(2,31)-1, true);
        check(-Math.pow(2,31), true);

        check(0.1, false);
        check(-0.1, false);
        check(400.5, false);
        check(Infinity, false);
        check(-Infinity, false);
        check(NaN, false);
        check('0', false);
        check('1', false);
        check(true, false);
        check(false, false);
        check(undefined, false);
        check(null, false);
        check([], false);
        check({}, false);
        check(function(){}, false);
    });

    it('should validate maximums', () => {
        let schema = {
            'someNumber': [ Number, 10]
        };
        function check(num, expectedResult) {
            expect( normalize({'someNumber': num}, schema).valid )
                .toBe(expectedResult);
        }

        check(0, true);
        check(1, true);
        check(9, true);
        check(9.99999, true);
        check(10, true);

        check(-1, false);
        check(-0.0001, false);
        check(10.0001, false);
        check(11, false);
    });

    it('should validate minimums/maximums', () => {
        let schema = {
            'someNumber': [ Number, -12, -3]
        };
        function check(num, expectedResult) {
            expect( normalize({'someNumber': num}, schema).valid )
                .toBe(expectedResult);
        }

        check(-12, true);
        check(-11.9999, true);
        check(-11, true);
        check(-4, true);
        check(-3.0001, true);
        check(-3, true);

        check(-13, false);
        check(-12.0001, false);
        check(-2.9999, false);
        check(-2, false);
        check(1, false);
        check(0, false);
        check(-1, false);
        check(12, false);
        check(3, false);
    });

    it('should validate enumerations', () => {
        let schema = {
            'someEnum': [ 'string', '0', 'false', '', 'null', 'undefined' ]
        }
        function check(str, expectedResult) {
            expect( normalize({'someEnum': str}, schema).valid )
                .toBe(expectedResult);
        }

        check('string', true);
        check('0', true);
        check('false', true);
        check('', true);
        check('null', true);
        check('undefined', true);

        check('stringgg', false);
        check('String', false);
        check(0, false);
        check(false, false);
        check(null, false);
        check(undefined, false);
        check([], false);
        check({}, false);
    });

    it('should validate regular expressions', () => {
        let schema = {
            'field': [ /^a*$/g ]
        }
        function check(str, expectedResult) {
            expect( normalize({'field': str}, schema).valid )
                .toBe(expectedResult);
        }

        check('', true);
        check('a', true);
        check('aaa', true);
        
        check('b', false);
        check(undefined, false);
        check(null, false);
        check(0, false);
        check(1, false);
        check(true, false);
        check(false, false);
        check([], false);
        check({}, false);
    });

    it('should validate functions', () => {
        let schema = {
            'state': ['full', 'empty'],
            'contents': (obj)=> obj.state === 'full' ? [String,10] : undefined
        }
        function check(obj, expectedResult) {
            expect( normalize(obj, schema).valid )
                .toBe(expectedResult);
        }

        check({state:'empty'}, true);
        check({state:'full', contents:'water'}, true);

        check({state:'empty', contents:'stuff'}, false);
        check({state:'full'}, false);
    });

    it('should validate inner schemas', () => {
        let schema = {
            'name': {
                'first': [String, 30],
                'last': [String, 30]
            }
        }
        function check(obj, expectedResult) {
            expect( normalize(obj, schema).valid )
                .toBe(expectedResult);
        }

        check({name:{first:'John',last:'Doe'}}, true);

        check({name:{}}, false);
        check({name:[]}, false);
        check({name:{first:'John'}}, false);
        check({first:'John', last:'Doe'}, false);
        check({name:{first:'John',last:'Doe',extraField:'Hello'}}, false);

        let obj = {name:{first:'John',last:'Doe',extraField:undefined}};
        expect(obj.name.hasOwnProperty('extraField')).toBe(true);
        check(obj, true);
        expect(obj.name.hasOwnProperty('extraField')).toBe(false);
    });
});