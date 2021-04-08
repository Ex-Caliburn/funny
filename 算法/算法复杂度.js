// n = 100
// for (let i = 0; i < n; i = i * 2) {
//     console.log(i)
// }

// for (let i = 0; i < n; i++) {
//     for (let j = 0; j < n; j++) {
//         console.log(i, j)
//     }
// }
function fib(n) {
    if (n < 2) return n
    return fib(n - 1) + fib(n - 2)
}

//fib 会有大量重复的计算，如何优化
//   f(5) = f(4) + f(3) = 2f(3) + f(2) = 3f(2) + f(1) = 4f(1) + 3f(0)
function fib2(n) {
    if (!fib2.cache) {
        fib2.cache = {}
    } else if (fib2.cache[n]) {
        return fib2.cache[n]
    }
    if (n < 2) {
        fib2.cache[n] = n
    } else {
        fib2.cache[n] = fib2(n - 1) + fib2(n - 2)
    }
    return fib2.cache[n]
}

num = 4
console.time('fib')
console.log(fib(num))
console.timeEnd('fib')

console.time('fib2')
console.log(fib2(num))
console.timeEnd('fib2')

// 102334155
// 1: 999.952ms
// 102334155
// 2: 0.099ms
// 时间快了 30多倍， fib2 比 fib1 时间提升慢很多


// 数组缓存
let arr = []
function fib3(n) {
    if (n < 1) {
        arr[0] = 0
        return arr[0]
    }
    if (n < 2) {
        arr[1] = 1
        return arr[1]
    }
    arr[n] = (arr[n - 1] || fib3(n - 1)) + (arr[n - 2] || fib3(n - 2))
    return arr[n]
}

console.time('fib3')
console.log(fib3(num))
console.timeEnd('fib3')

// 我不要缓存每一次的结果，只需要缓存 f(6) = f(5) + f(4), 我只缓存  f(4) f(3), 最后都是 f(1) f(0)
// 没必要用数组了
let first = 0
let second = 0
function fib4(n) {
    if (n < 1) {
        first = 0
        return 0
    }
    if (n < 2) {
        first = 0
        return 1
    }
    second = fib4(n - 1)
    res = second + first
    first = second
    return res
}


console.time('fib4')
console.log(fib4(num))
console.timeEnd('fib4')


// 逆推 非递归 最快 时间 O(n), 空间 O(n)
function fib5(n, a = 1, b = 0) {
    if (n < 1) return b
    if (n < 2) return a
    return fib5(--n, a + b, a)
}


console.time('fib5')
console.log(fib5(num))
console.timeEnd('fib5')

 
// HashMap  数组把每个结果存起来 用循环而不是递归更清晰
function fib6(n) {
    let arr = [0, 1]
    for (let i = 2; i <= n; i++) {
        arr[i] = arr[i - 1] + arr[i - 2]
    }
    return arr[n]
}

// HashMap 只存两个变量
function fib7(n) {
    let first = 1
    let second = 0
    let res = 0
    for (let i = 2; i <= n; i++) {
        res = first + second
        second = first
        first = res
    }
    return res
}


  
console.time('fib7')
console.log(fib7(num))
console.timeEnd('fib7')