function validateObject(obj, requirements) {
    if (!obj || typeof obj !== 'object') return { valid: false, error: `Not an object` };
    for (let propName in requirements) {
        let value = obj[propName];
        let requirement = requirements[propName];
        
        let error = validateProperty(propName, value, obj, requirement);
        if (error !== true) return { valid: false, error: error.message };
    }
    for (let propName in obj) {
        if (obj[propName] === undefined) {
            delete obj[propName];
        }
        else if (!requirements.hasOwnProperty(propName)) {
            return { valid: false, error: `Contains extra property: ${propName}` };
        }
    }
    return { valid: true };
}
module.exports = validateObject;

function validateProperty(propName, value, obj, requirement) {
    // find the type of the requirement and if it is optional
    let type = Array.isArray(requirement) ? requirement[0] : requirement;
    let optional = false;
    if (type && type.$optional) {
        optional = true;
        type = type.$optional;
    }
    
    // if it's a function, resolve it
    if ((typeof type) === 'function' && ![String, Number, Number.isInteger, Array].includes(type)) {
        let newRequirement = type(obj);
        if (newRequirement === true || newRequirement instanceof Error) return newRequirement;
        return validateProperty(propName, value, obj, newRequirement);
    }
    
    // undefined means the property should NOT be there. if it is there and undefined, it still shouldn't work.
    if (type === undefined) {
        if (value !== undefined) return new Error(`${propName} should not be present.`);
        return true;
    }
    if (value === undefined) {
        if (!optional) return new Error(`Missing property: ${propName}`);
        return true;
    }
    
    // if type is the literal String, it will accept a string of max length (number).
    if (type === String) {
        let max = ((typeof requirement[1]) === 'number') ? requirement[1] : Infinity;
        if (typeof(value) !== 'string') return new Error(`${propName} is not a string.`);
        if (value.length === 0 && !optional) return new Error(`${propName} is empty.`);
        obj[propName] = value = value.trim();
        if (value.length === 0 && !optional) return new Error(`${propName} is only whitespace.`);
        if (value.length > max) return new Error(`${propName} is longer than ${max} characters.`);
        return true;
    }

    // if type is the literal Number, it will accept a number, with optional min/max
    if (type === Number || type === Number.isInteger) {
         let min = -Infinity, max = Infinity;
         if (Number.isNaN(value)) return new Error(`${propName} is NaN.`);
         if (Number(value) !== value) return new Error(`${propName} is not a number.`);
         if (!Number.isFinite(value)) return new Error(`${propName} is infinite.`);
         if (type === Number.isInteger && !Number.isInteger(value)) return new Error(`${propName} is not an integer.`);
         if (requirement.length === 3) {
              min = requirement[1];
              max = requirement[2];
         }
         else if (requirement.length === 2) {
              min = 0;
              max = requirement[1];
         }
         if (value < min) return new Error(`${propName} is less than ${min}.`);
         if (value > max) return new Error(`${propName} is greater than ${max}.`);
         return true;
    }
    
    // if type is a Regular Expression, check for a match
    if (type instanceof RegExp) {
        if (typeof(value) !== 'string') return new Error(`${propName} is not a string.`);
        if (!value.match(type)) return new Error(`"${value}" is not a valid format for ${propName}: ${requirement.toString()}`);
        return true;
    }

    // Array literal means that it's an array of some requirement.
    if (type === Array) {
        if (!Array.isArray(value)) return new Error(`${propName} is not an array.`);
        let problemIndex = value.findIndex((v,i)=>validateProperty(i, v, value, requirement.slice(1)) !== true);
        if (problemIndex !== -1) return new Error(`"${propName}" is invalid.`);
        return true;
    }
    
    // non-array objects are some kind of inner schema. resolve recursively.
    if ((typeof type) === 'object' && !Array.isArray(type)) {
        let validation = validateObject(value, type)
        return validation.valid || new Error(validation.error);
    }
    
    // if type is a string (not the literal String), it's an enum
    if (['string', 'number', 'boolean'].includes(typeof type)) {
        if (!requirement.includes(value)) return new Error(`"${value}" is not valid for ${propName}`);
        return true;
    }
    
    return new Error(`Unknown type: "${type}"`);
}
