var list = ['e', 'a', 'c', 'b'];

var mapped = list.map(function(el, i) {
  return { index: i, value: el.toLowerCase() };
})

// 按照多个值排序数组
mapped.sort(function(a, b) {
  return +(a.value > b.value) || +(a.value === b.value) - 1;
});


function InsertionSort(a, from, to) {
        for (var i = from + 1; i < to; i++) {
          var element = a[i];
          for (var j = i - 1; j >= from; j--) {
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
    