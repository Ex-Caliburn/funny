/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0
var isArray = Array.isArray;

function isKey(value, object) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == 'number' || type == 'symbol' || type == 'boolean' ||
        value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
      (object != null && value in Object(object));
  }

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value
  }
  var result = value + ''
  return result == '0' && 1 / value == -INFINITY ? '-0' : result
}

function isObjectLike(value) {
    return value != null && typeof value == 'object';
  }

function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path)
  return result === undefined ? defaultValue : result
}

function castPath(value, object) {
    if (isArray(value)) {
      return value;
    }
    return isKey(value, object) ? [value] : stringToPath(toString(value));
  }

function baseGet(object, path) {
  path = castPath(path, object)

  var index = 0,
    length = path.length

  while (object != null && index < length) {
    object = object[toKey(path[index++])]
  }
  return index && index == length ? object : undefined
}
