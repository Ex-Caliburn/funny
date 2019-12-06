let isString = (obj) => {
  return Object.prototype.toString.call(obj) === '[object String]';
};
let isFunction = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Function]';
};
let isArray = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Array]';
};
let isSet = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Set]';
};
// 复制代码可以看到，出现了非常多重复的逻辑。我们将它们做一下封装:
  let isType = (type) => {
    return (obj) => {
      return Object.prototype.toString.call(obj) === `[object ${type}]`;
    }
  }
let isString = isType('String');
let isFunction = isType('Function');
