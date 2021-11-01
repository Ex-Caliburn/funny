// 从数组中选择一个元素作为基准点
// 排序数组,所有比基准值小的元素摆放在左边,而大于基准值的摆放在右边。每次分割结束以后基准值会插入到中间去。
// 最后利用递归,将摆放在左边的数组和右边的数组在进行一次上述的1和2操作。
// 1. https://segmentfault.com/a/1190000017814119
//  递归结束
// 左数组 右数组，递归排序，最后concat在遗爱 
// item >= pivot 看情况设置，看需求

 function quickSort(arr) {
     if (arr.length <= 0 ) {
         return arr
     }
     let leftArr = []
     let rightArr = []
     let pivot = arr.pop() // 大家默认是取最后一个
     arr.map(item => {
         if (item >= pivot) {
            rightArr.push(item)
         } else {
            leftArr.push(item)
         }
     })
    return quickSort(leftArr).concat(pivot, quickSort(rightArr)) 
 }

 let arr = [15,13,7,12,8]
// left [13,7,12,8] 15 right [] 
// left [7,12,8]  13 right [] 
// left []  7 right [8,12] 
// left []  8 right [12] 
console.log(quickSort(arr))

// https://juejin.cn/post/6844904174014955527#heading-10

// 因为我们是想把数组分割的更均匀，均匀的时间复杂度更低；但是如果这是一个有序的数组，那么总是取最后一个是最不均匀的取法。

// 所以应该随机取 pivot，这样就避免了因为数组本身的特点总是取到最值的情况。

// 不是稳定排序，相对位置变化了

// 对于不稳定的排序算法，只要举出一个实例，即可说明它的不稳定性；而对于稳定的排序算法，
// 必须对算法进行分析从而得到稳定的特性。需要注意的是，排序算法是否为稳定的是由具体算法决定的，
// 不稳定的算法在某种条件下可以变为稳定的算法，而稳定的算法在某种条件下也可以变为不稳定的算法。

// 再如，快速排序原本是不稳定的排序方法，但若待排序记录中只有一组具有相同关键码的记录，
// 而选择的轴值恰好是这组相同关键码中的一个，此时的快速排序就是稳定的。