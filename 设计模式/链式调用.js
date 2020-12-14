
/**
 *  需求 
 * add(1)(2)(3)(4) = 10
 * add(1)(2) = 3
 *  链式调用思路， 返回函数，并对函数的 toString 和 valueOf 进行处理 
 * 1. 发现了 node 和浏览器返回不一样，但是类型都是 function。 chrome 打印 f 你设置的返回值，Safari 直接 你设置的返回值， 而node 只有函数，
 * 实际应用场景 如 jquery， node, pipe调用， 数组和 字符串的方法连续调用
 * eg：jq: $().add().remove(), node: target.start().config().stop()
 *  str.slice(0).toLowerCase().toUpperCase(), arr.reverse().sort()
 * 这道题实际考察是思路，这道题的应用场景不在这里也不合适
 * 思路： 链式调用思路， 返回函数，并对函数的 toString 和 valueOf 进行处理，
 */

// 首次写 多了 initValue ，其实把运算后的值返回就好了，包一个函数，而且写的不对，initValue没用
// 刚开始 node 返回和我预期不一样，以为我写错，其实就是node 和浏览器不一样
function add(val = 0, initValue = 0) {
    val = initValue + val
    console.log(val)
    add.valueOf = function () {
        console.log('valueOf1')
        return val
    }
    add.toString = function () {
        console.log('toString2')
        return val
    }
    return add
}
console.log(add(1)(2))
 
// 第二次 还是少考虑返回   return add(newV + val)
function add(val = 0) {
    let _returnFn = function(newV = 0) {
       return add(newV + val)
    }
    _returnFn.valueOf = function () {
        console.log('valueOf1')
        return val
    }
    _returnFn.toString = function () {
        console.log('toString2')
        return val
    }
    return _returnFn
}

console.log(add(1)(2))

// 典范
function add(val) {
    function _retFun(v) {
      return add(val + v);
    }
    _retFun.toString = _retFun.valueOf = function () {
      return val;
    };
    return _retFun;
  }
  
//   console.log(add(1)(2)(3)(4));