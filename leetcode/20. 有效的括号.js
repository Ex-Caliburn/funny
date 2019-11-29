// 给定一个只包括 '('，')'，'{'，'}'，'['，']' 的字符串，判断字符串是否有效。
//
// 有效字符串需满足：
//
// 左括号必须用相同类型的右括号闭合。
// 左括号必须以正确的顺序闭合。
// 注意空字符串可被认为是有效字符串。
/**
 * @param {string} s
 * @return {boolean}
 */
/* 第一次的思路，耗时三天 */
var isValid = function (s) {
  let map2 = {
    '{': 1,
    '}': -1,
    '(': 3,
    ')': -3,
    '[': 2,
    ']': -2,
  }
  let tree = []
  let arr = s.split('')
  for (let i = 0; i < arr.length; i++) {
    let flag = step2(tree, map2[arr[i]])
    console.log(map2[arr[i]], flag)
    if (!flag) {
      return false
    }
  }

  function step2(child, val) {
    if (!child.length) {
      child.push({
        isClose: false,
        val: val,
        child: []
      })
    } else {
      let lastItem = child[child.length - 1]
      if (val > 0) {
        if (lastItem.isClose) {
          child.push({
            isClose: false,
            val: val,
            child: []
          })
        } else {
          step2(lastItem.child, val)
        }
      } else {
        if (lastItem.isClose) {
          return false
        } else {
          if (lastItem.child.length && !lastItem.child[lastItem.child.length - 1].isClose) {
            step2(lastItem.child, val)
          } else if (val === -lastItem.val) {
            lastItem.isClose = true
          } else {
            return false
          }
        }
      }
    }
    return true
  }

  console.log(tree)
  return check(tree)

  function check(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].isClose) {
        return false
      } else if (arr[i].child.length) {
        if (!check(arr[i].child)) {
          return false
        }
      }
    }
    return true
  }
}

/* 参考别人的思路，太牛逼了 出入栈操作*/
var isValid2 = function (s) {
  let map = {
    '{': '}',
    '[': ']',
    '(': ')',
  }
  let stack = []
  for (let str of s) {
    if (['{', '[', '('].includes(str)) {
      stack.push(str)
    } else {
      if (map[stack.pop()] !== str) {
        return false
      }
    }
  }
  if (stack.length) return false
  return true
}

console.log(isValid2('()'))

/*  正则 删除一对一对 */
var isValid3 = function(s) {
  let re = /(\[\])|(\(\))|(\{\})/g;
  while (re.test(s)) {
    s = s.replace(re, "");
  }
  return s.length === 0;
};
