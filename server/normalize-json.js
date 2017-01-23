function validateObject(obj, requirements) {
   for (var propName in requirements) {
      var value = obj[propName];
      var requirement = requirements[propName];
      
      var error = validateProperty(propName, value, obj, requirement);
      if (error !== true) return { valid: false, error: error.message };
   }
   for (var propName in obj) {
      if (!requirements.hasOwnProperty(propName)) {
         return { valid: false, error: `Contains extra property: ${propName}` };
      }
   }
   return { valid: true };
}
module.exports = validateObject;

function validateProperty(propName, value, obj, requirement) {
   // find the type of the requirement and if it is optional
   var type = Array.isArray(requirement) ? requirement[0] : requirement;
   var optional = false;
   if (type && type.$optional) {
      optional = true;
      type = type.$optional;
   }
   
   // if it's a function, resolve it
   if ((typeof type) === 'function' && type !== String) {
      var newRequirement = type(obj);
      if (newRequirement === true || newRequirement instanceof Error) return newRequirement;
      return validateProperty(propName, value, obj, newRequirement);
   }
   
   // undefined means the property should NOT be there. if it is there and undefined, it still shouldn't work.
   if (type === undefined) {
      if (value !== undefined) return new Error(`${propName} should not be present.`);
      delete obj[propName];
      return true;
   }
   if (value === undefined) {
      if (optional) return true;
      else return new Error(`Missing property: ${propName}`);
   }
   
   // if type is the literal String, it will accept a string of max length (number).
   if ((type === String) && (typeof requirement[1]) === 'number') {
      if (typeof(value) !== 'string') return new Error(`${propName} is not a string.`);
      if (value.length === 0 && !optional) return new Error(`${propName} is empty.`);
      obj[propName] = value = value.trim();
      if (value.length === 0 && !optional) return new Error(`${propName} is only whitespace.`);
      return true;
   }
   
   if (type instanceof RegExp) {
      if (typeof(value) !== 'string') return new Error(`${propName} is not a string.`);
      if (!value.match(type)) return new Error(`"${value}" is not a valid format for ${propName}: ${requirement.toString()}`);
      return true;
   }
   
   // non-array objects are some kind of inner schema. resolve recursively.
   if ((typeof type) === 'object' && !Array.isArray(type)) {
      var validation = validateObject(value, type)
      return validation.valid || new Error(validation.error);
   }
   
   // if type is a string (not the literal String), it's an enum
   if ((typeof type) === 'string') {
      if (requirement.indexOf(value) === -1) return new Error(`"${value}" is not valid for ${propName}`);
      return true;
   }
   
   return new Error(`Unknown type: "${type}"`);
}
