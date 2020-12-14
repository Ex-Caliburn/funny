# sort

// 想想输出什么，为什么有这种区别

```javascript
[11, 100].sort()
[11, 10].sort()

'11' > '101'
```

## 前言

sort 浏览器内部实现
当长度小于22时使用(In-place QuickSort algorithm)原地快速排序算法

大于22使用插入排序(insertion sort),原来插入排序不是稳定的，现在稳定了

### ECMA-262 官方描述 Array.prototype.sort(comparefn)

当比较操作函数用x,y两个参数调用的时候，会按照接下来的步骤进行：

1. 如果x,y都是undefined，返回 +0
2. 如果x是undefined,返回 1
3. 如果y是undefined,返回 -1
4. 如果没有提供comparefn，跳至第七步
5. 用comparefn比较x,y
6. 返回第五步的比较结果
7. x.toString()
8. y.toString()
9. 如果第八步大于第七步，返回-1
10. 如果第七步大于第八步，返回1
11. 返回+0

 // 比较ASCII码的大小，并且是按位比较，判断出大小就不会继续比较 所以101 比 11 小，
SmiLexicographicCompare

```javascript
 function InnerArraySort(array, length, comparefn) {
      // In-place QuickSort algorithm.
      // For short (length <= 22) arrays, insertion sort is used for efficiency.

      if (!IS_CALLABLE(comparefn)) {
        comparefn = function (x, y) {
          if (x === y) return 0;
          if (%_IsSmi(x) && %_IsSmi(y)) {
            return %SmiLexicographicCompare(x, y);
          }
          x = TO_STRING(x);
          y = TO_STRING(y);
          if (x == y) return 0;
          else return x < y ? -1 : 1;
        };
      }
      var InsertionSort = function InsertionSort(a, from, to) {
        for (var i = from + 1; i < to; i++) {
          var element = a[i];
          for (var j = i 2.  1; j >= from; j--) {
            var tmp = a[j];
            var order = comparefn(tmp, element);
            if (order > 0) {
              a[j + 1] = tmp;
            } else {
              break;
            }
          }
          a[j + 1] = element;
        }
      };
      ...省略
 }

```

```javascript
快速排序：

```

### Array.prototype.sort() 的排序稳定性

排序稳定性（stable sorting）是排序算法的重要属性，指的是排序关键字相同的项目，排序前后的顺序不变。

```js
const arr = [
  'peach',
  'straw',
  'apple',
  'spork'
];

const stableSorting = (s1, s2) => {
  if (s1[0] < s2[0]) return -1;
  return 1;
};

arr.sort(stableSorting)
// ["apple", "peach", "straw", "spork"]
上面代码对数组arr按照首字母进行排序。排序结果中，straw在spork的前面，跟原始顺序一致，所以排序算法stableSorting是稳定排序。

const unstableSorting = (s1, s2) => {
  if (s1[0] <= s2[0]) return -1;
  return 1;
};

arr.sort(unstableSorting)
// ["apple", "peach", "spork", "straw"]
```

上面代码中，排序结果是spork在straw前面，跟原始顺序相反，所以排序算法unstableSorting是不稳定的。

常见的排序算法之中，插入排序、合并排序、冒泡排序等都是稳定的，堆排序、快速排序等是不稳定的。不稳定排序的主要缺点是，多重排序时可能会产生问题。假设有一个姓和名的列表，要求按照“姓氏为主要关键字，名字为次要关键字”进行排序。开发者可能会先按名字排序，再按姓氏进行排序。如果排序算法是稳定的，这样就可以达到“先姓氏，后名字”的排序效果。如果是不稳定的，就不行。

早先的 ECMAScript 没有规定，Array.prototype.sort()的默认排序算法是否稳定，留给浏览器自己决定，这导致某些实现是不稳定的。ES2019 明确规定，Array.prototype.sort()的默认排序算法必须稳定。这个规定已经做到了，现在 JavaScript 各个主要实现的默认排序算法都是稳定的。

## 总结

## 参考文献

1. <https://github.com/v8/v8/blob/ad82a40509c5b5b4680d4299c8f08d6c6d31af3c/src/js/array.js>
2. <https://www.ecma-international.org/publications/files/ECMA-ST-ARCH/ECMA-262,%201st%20edition,%20June%201997.pdf>
3. <http://www.voidcn.com/article/p-alcuvtfn-bse.html>
4. <https://www.ecma-international.org/ecma-262/6.0/#sec-array.prototype.sort>
5. <https://v8.dev/features/stable-sort>
6. <https://zhuanlan.zhihu.com/p/33626637>
7. <https://tc39.es/ecma262/>
8. 为什么插入排序比冒泡排序更受欢迎？<https://www.jianshu.com/p/4d65992dc493>
9. <https://v8.dev/blog/array-sort>
10. <https://es6.ruanyifeng.com/?search=reduce&x=4&y=9#docs/array#%E6%95%B0%E7%BB%84%E5%AE%9E%E4%BE%8B%E7%9A%84-flat%EF%BC%8CflatMap>
