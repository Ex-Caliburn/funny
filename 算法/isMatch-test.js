function isMatch(str) {
  let len
  while (str) {
    len = str.length
    str = str.replace(/\(\)|\[\]|\{\}/, '')
    console.log(str)
    if (str.length % 2 === 1 || str.length === len) {
      return false
    }
  }
  return true
}
// isMatch('([)]')
// console.log(isMatch('()'))
// a = '([)]'
// // a.replace(/\(\)|\[\]|\{\}/, '')
// console.log(a.replace(/\(\)|\[\]|\{\}/, ''))
// console.log(a.length % 2 === 1)

// {()[]}
// {(
// {
// {[
// {

function isMatch2(str) {
  let arr = str.split('')
  let item
  let stack = []
  let map = {
    '{': '}',
    '[': ']',
    '(': ')'
  }
  while (arr.length) {
    item = arr.shift()
    if (['{', '[', '('].includes(item)) {
      stack.push(item)
    } else if (map[stack.pop()] !== item) {
      return false
    }
  }
  if (stack.length) {
    return false
  }
  return true
}
console.log(isMatch3('()'))

function isMatch2(str) {
  let map = {
    '{': '}',
    '[': ']',
    '(': ')'
  }
  let stack = []
  for (let item of str) {
    if (['{', '[', '('].includes(item)) {
      stack.push(item)
    } else if (map[stack.pop()] !== item) {
      return false
    }
  }
  if (stack.length) return false
  return true
}
console.log(isMatch3('()'))
