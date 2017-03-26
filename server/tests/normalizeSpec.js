/* global describe it expect */
const normalize = require('../normalize-json');
const schemaMatchers = require('./support/schemaMatchers');

describe("normalize-json", () => {

    beforeEach(() => jasmine.addMatchers(schemaMatchers.matchers));

    it('should reject non-objects', () => {
        let nonObjects = [undefined, null, 0, 1, true, false, 'just a string', '', [], function(){}];

        for (obj of nonObjects) {
            expect(obj).not.toFitSchema({ 'field': [ String ] })
        }
    })

    it('should require all fields', () => {
        schemaMatchers.setSchema({
            'first': [ String ],
            'second': [ {$optional:String} ]
        });
        expect({'first': 'here'}).toFitSchema();
        expect({'first': 'here', 'second': 'here'}).toFitSchema();

        expect({}).not.toFitSchema();
        expect({'second': 'here'}).not.toFitSchema();
    });

    it('should strip undefined values from fields not in the schema', () => {
        schemaMatchers.setSchema({ first: [ String ] });

        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(obj).toNormalizeTo({ first: 'should be here' });
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should strip undefined values from $optional fields', () => {
        schemaMatchers.setSchema({
            first: [ String ],
            second: [ {$optional:String} ]
        });
        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(obj).toNormalizeTo({ first: 'should be here' });
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should strip undefined values from fields resolved as undefined', () => {
        schemaMatchers.setSchema({
            first: [ String ],
            second: () => undefined
        });
        let obj = { first: 'should be here', second: undefined };
        expect(obj.hasOwnProperty('second')).toBe(true);
        expect(obj).toNormalizeTo({ first: 'should be here' });
        expect(obj.hasOwnProperty('second')).toBe(false);
    });

    it('should reject unexpected fields', () => {
        schemaMatchers.setSchema({ 'good': [ String ] });
        expect({'good': 'present', 'extra': 'also here'}).not.toFitSchema();
    });

    it('should validate strings', () => {
        schemaMatchers.setSchema({ 'str': [ String ] });

        expect({'str': 'hello'}).toFitSchema();
        expect({'str': 'a'}).toFitSchema();
        expect({'str': 'undefined'}).toFitSchema();
        expect({'str': 'null'}).toFitSchema();
        expect({'str': 'true'}).toFitSchema();
        expect({'str': 'false'}).toFitSchema();
        expect({'str': '0'}).toFitSchema();
        expect({'str': '1'}).toFitSchema();
        expect({'str': 'unicode ♥'}).toFitSchema();
        expect({'str': '©️©️©️©️©️'}).toFitSchema();
        expect({'str': '😂😂😂😂😂'}).toFitSchema();
        expect({'str': 'zal͞g͡o t̷ęx͜t'}).toFitSchema();

        expect({'str': ''}).not.toFitSchema();
        expect({'str': undefined}).not.toFitSchema();
        expect({'str': null}).not.toFitSchema();
        expect({'str': true}).not.toFitSchema();
        expect({'str': false}).not.toFitSchema();
        expect({'str': 0}).not.toFitSchema();
        expect({'str': 1}).not.toFitSchema();
        expect({'str': 999}).not.toFitSchema();
        expect({'str': 9.9}).not.toFitSchema();
        expect({'str': [] }).not.toFitSchema();
        expect({'str': {} }).not.toFitSchema();
        expect({'str': function(){} }).not.toFitSchema();
    });

    it('should validate strings with a maximum length', () => {
        schemaMatchers.setSchema({ 'str': [ String, 10 ] });

        expect({'str': 'hello'}).toFitSchema();
        expect({'str': 'a'}).toFitSchema();
        expect({'str': '10 letters'}).toFitSchema();
        expect({'str': 'unicode ♥'}).toFitSchema();
        expect({'str': '♥♥♥♥♥'}).toFitSchema();
        expect({'str': '©️©️©️©️©️'}).toFitSchema();
        expect({'str': '😂😂😂😂😂'}).toFitSchema();

        expect({'str': ''}).not.toFitSchema();
        expect({'str': undefined}).not.toFitSchema();
        expect({'str': null}).not.toFitSchema();
        expect({'str': 'elevenchars'}).not.toFitSchema();
        expect({'str': 'unicode✖️✖️'}).not.toFitSchema();
        expect({'str': Array(100).join('VERYLONG') }).not.toFitSchema();
    });

    it('should validate Optional strings too', () => {
        schemaMatchers.setSchema({ 'str': [ {$optional:String}, 10 ] });

        expect({'str': 'hello'}).toFitSchema();
        expect({'str': 'a string'}).toFitSchema()
        expect({'str': undefined}).toFitSchema()
        expect({'str': ''}).toFitSchema()
        expect({'str': 'null'}).toFitSchema()
        expect({'str': '0'}).toFitSchema()
        expect({'str': 'false'}).toFitSchema()

        expect({'str': null}).not.toFitSchema()
        expect({'str': 0}).not.toFitSchema()
        expect({'str': false}).not.toFitSchema()
        expect({'str': []}).not.toFitSchema()
        expect({'str': {}}).not.toFitSchema()
        expect({'str': 'still too long'}).not.toFitSchema()
    });

    it('should validate numbers', () => {
        schemaMatchers.setSchema({ 'num': [ Number ] });

        expect({'num': 0}).toFitSchema()
        expect({'num': 1}).toFitSchema()
        expect({'num': 0.00001}).toFitSchema()
        expect({'num': 9999999999}).toFitSchema()
        expect({'num': -1}).toFitSchema()

        expect({'num': Infinity}).not.toFitSchema()
        expect({'num': -Infinity}).not.toFitSchema()
        expect({'num': NaN}).not.toFitSchema()
        expect({'num': '0'}).not.toFitSchema()
        expect({'num': '1'}).not.toFitSchema()
        expect({'num': true}).not.toFitSchema()
        expect({'num': false}).not.toFitSchema()
        expect({'num': undefined}).not.toFitSchema()
        expect({'num': null}).not.toFitSchema()
        expect({'num': []}).not.toFitSchema()
        expect({'num': {}}).not.toFitSchema()
        expect({'num': function(){} }).not.toFitSchema()
    });

    it('should validate integers', () => {
        schemaMatchers.setSchema({ 'num': [ Number.isInteger ] });

        expect({'num': 0}).toFitSchema()
        expect({'num': 1}).toFitSchema()
        expect({'num': -1}).toFitSchema()
        expect({'num': Math.pow(2,31)-1}).toFitSchema()
        expect({'num': -Math.pow(2,31)}).toFitSchema()

        expect({'num': 0.1}).not.toFitSchema()
        expect({'num': -0.1}).not.toFitSchema()
        expect({'num': 400.5}).not.toFitSchema()
        expect({'num': Infinity}).not.toFitSchema()
        expect({'num': -Infinity}).not.toFitSchema()
        expect({'num': NaN}).not.toFitSchema()
        expect({'num': '0'}).not.toFitSchema()
        expect({'num': '1'}).not.toFitSchema()
        expect({'num': true}).not.toFitSchema()
        expect({'num': false}).not.toFitSchema()
        expect({'num': undefined}).not.toFitSchema()
        expect({'num': null}).not.toFitSchema()
        expect({'num': []}).not.toFitSchema()
        expect({'num': {}}).not.toFitSchema()
        expect({'num': function(){}}).not.toFitSchema()
    });

    it('should validate maximums', () => {
        schemaMatchers.setSchema({ 'num': [ Number, 10] });

        expect({'num': 0}).toFitSchema()
        expect({'num': 1}).toFitSchema()
        expect({'num': 9}).toFitSchema()
        expect({'num': 9.99999}).toFitSchema()
        expect({'num': 10}).toFitSchema()

        expect({'num': -1}).not.toFitSchema()
        expect({'num': -0.0001}).not.toFitSchema()
        expect({'num': 10.0001}).not.toFitSchema()
        expect({'num': 11}).not.toFitSchema()
    });

    it('should validate minimums/maximums', () => {
        schemaMatchers.setSchema({ 'num': [ Number, -12, -3] });

        expect({'num': -12}).toFitSchema()
        expect({'num': -11.9999}).toFitSchema()
        expect({'num': -11}).toFitSchema()
        expect({'num': -4}).toFitSchema()
        expect({'num': -3.0001}).toFitSchema()
        expect({'num': -3}).toFitSchema()

        expect({'num': -13}).not.toFitSchema()
        expect({'num': -12.0001}).not.toFitSchema()
        expect({'num': -2.9999}).not.toFitSchema()
        expect({'num': -2}).not.toFitSchema()
        expect({'num': 1}).not.toFitSchema()
        expect({'num': 0}).not.toFitSchema()
        expect({'num': -1}).not.toFitSchema()
        expect({'num': 12}).not.toFitSchema()
        expect({'num': 3}).not.toFitSchema()
    });

    it('should validate string enumerations', () => {
        schemaMatchers.setSchema({
            'someEnum': [ 'string', '0', 'false', '', 'null', 'undefined' ]
        });

        expect({'someEnum': 'string'}).toFitSchema()
        expect({'someEnum': '0'}).toFitSchema()
        expect({'someEnum': 'false'}).toFitSchema()
        expect({'someEnum': ''}).toFitSchema()
        expect({'someEnum': 'null'}).toFitSchema()
        expect({'someEnum': 'undefined'}).toFitSchema()

        expect({'someEnum': 'stringgg'}).not.toFitSchema()
        expect({'someEnum': 'String'}).not.toFitSchema()
        expect({'someEnum': 0}).not.toFitSchema()
        expect({'someEnum': false}).not.toFitSchema()
        expect({'someEnum': null}).not.toFitSchema()
        expect({'someEnum': undefined}).not.toFitSchema()
        expect({'someEnum': []}).not.toFitSchema()
        expect({'someEnum': {}}).not.toFitSchema()
    });

    it('should validate numerical enumerations', () => {
        schemaMatchers.setSchema({
            'someEnum': [0, 2, -4]
        });

        expect({'someEnum': 0}).toFitSchema();
        expect({'someEnum': 2}).toFitSchema();
        expect({'someEnum': -4}).toFitSchema();

        expect({'someEnum': false}).not.toFitSchema()
        expect({'someEnum': null}).not.toFitSchema()
        expect({'someEnum': undefined}).not.toFitSchema()
        expect({'someEnum': []}).not.toFitSchema()
        expect({'someEnum': {}}).not.toFitSchema()
        expect({'someEnum': '0'}).not.toFitSchema()
        expect({'someEnum': '2'}).not.toFitSchema()
        expect({'someEnum': '-4'}).not.toFitSchema()
        expect({'someEnum': 4}).not.toFitSchema()
    });

    it('should validate mixed enumerations', () => {
        schemaMatchers.setSchema({
            'someEnum': [7, '9', true, 'false']
        });

        expect({'someEnum': 7}).toFitSchema();
        expect({'someEnum': '9'}).toFitSchema();
        expect({'someEnum': true}).toFitSchema();
        expect({'someEnum': 'false'}).toFitSchema();

        expect({'someEnum': [7] }).not.toFitSchema()
        expect({'someEnum': [7,'9',true,'false',undefined] }).not.toFitSchema()
        expect({'someEnum': '7'}).not.toFitSchema()
        expect({'someEnum': 9}).not.toFitSchema()
        expect({'someEnum': 'true'}).not.toFitSchema()
        expect({'someEnum': false}).not.toFitSchema()
        expect({'someEnum': null}).not.toFitSchema()
        expect({'someEnum': NaN}).not.toFitSchema()
        expect({'someEnum': undefined}).not.toFitSchema();
        expect({'someEnum': 'undefined'}).not.toFitSchema()
        expect({ }).not.toFitSchema();
    });

    it('should validate regular expressions', () => {
        schemaMatchers.setSchema({
            'field': [ /^a*$/g ]
        });

        expect({'field': ''}).toFitSchema()
        expect({'field': 'a'}).toFitSchema()
        expect({'field': 'aaa'}).toFitSchema()
        
        expect({'field': 'b'}).not.toFitSchema()
        expect({'field': undefined}).not.toFitSchema()
        expect({'field': null}).not.toFitSchema()
        expect({'field': 0}).not.toFitSchema()
        expect({'field': 1}).not.toFitSchema()
        expect({'field': true}).not.toFitSchema()
        expect({'field': false}).not.toFitSchema()
        expect({'field': []}).not.toFitSchema()
        expect({'field': {}}).not.toFitSchema()
    });

    it('should validate functions', () => {
        schemaMatchers.setSchema({
            'state': ['full', 'empty'],
            'contents': (obj)=> obj.state === 'full' ? [String,10] : undefined
        });

        expect({state:'empty'}).toFitSchema()
        expect({state:'full', contents:'water'}).toFitSchema()

        expect({state:'empty', contents:'stuff'}).not.toFitSchema()
        expect({state:'full'}).not.toFitSchema()
    });

    it('should validate arrays', () => {
        schemaMatchers.setSchema({
            'words': [Array, String, 10]
        });

        expect({words:[]}).toFitSchema()
        expect({words:['hi']}).toFitSchema()
        expect({words:['hi','hello']}).toFitSchema()
    
        expect({ }).not.toFitSchema();
        expect({words:['too long first one'] }).not.toFitSchema();
        expect({words:['fine', 'ok', 'this one is not good']}).not.toFitSchema();
        expect({words:['hello', undefined, 'error']}).not.toFitSchema();
        expect({words:[9]}).not.toFitSchema();
        expect({words:[['too Nested']]}).not.toFitSchema();
    });

    it('should validate inner schemas', () => {
        schemaMatchers.setSchema({
            'name': {
                'first': [String, 30],
                'last': [String, 30]
            }
        });

        expect({name:{first:'John',last:'Doe'}} ).toFitSchema()

        expect({name:{}}).not.toFitSchema()
        expect({name:[]}).not.toFitSchema()
        expect({name:{first:'John'}}).not.toFitSchema()
        expect({first:'John', last:'Doe'}).not.toFitSchema()
        expect({name:{first:'John',last:'Doe',extraField:'Hello'}}).not.toFitSchema()

        let obj = {name:{first:'John',last:'Doe',extraField:undefined}};
        expect(obj.name.hasOwnProperty('extraField')).toBe(true);
        expect(obj).toFitSchema()
        expect(obj.name.hasOwnProperty('extraField')).toBe(false);
    });
});