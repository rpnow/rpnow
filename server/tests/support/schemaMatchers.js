let currentSchema = null;
const normalize = require('../../normalize-json');

module.exports = {
    setSchema: (schema) => currentSchema = schema,
    matchers: {
        toFitSchema: () => ({
            compare: (obj, schema) => {
                schema = schema || currentSchema;
                let test = normalize(obj, schema);

                return {
                    pass: test.valid,
                    message: test.valid? 
                        `Expected ${JSON.stringify(obj) || obj} to fail the spec`:
                        `Expected ${JSON.stringify(obj) || obj} to pass: nJ says "${test.error}"`
                };
            }
        }),
        toNormalizeTo: (util, customEqualityTesters) => ({
            compare: (obj, expectedObj) => {
                var test = normalize(obj, currentSchema);

                if (!test.valid) return {
                    pass: false,
                    message: `Expected ${JSON.stringify(obj) || obj} to pass: nJ says "${test.error}"`
                };

                var success = JSON.stringify(obj) === JSON.stringify(expectedObj)
                return {
                    pass: success,
                    message: success ? `Didn't expect the tester to negate this schema`: `Expected ${JSON.stringify(obj)} to be ${JSON.stringify(expectedObj)}`
                };
            }
        })
    }
};