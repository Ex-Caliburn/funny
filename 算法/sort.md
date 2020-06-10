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
