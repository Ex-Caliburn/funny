// 从数组中选择一个元素作为基准点
// 排序数组,所有比基准值小的元素摆放在左边,而大于基准值的摆放在右边。每次分割结束以后基准值会插入到中间去。
// 最后利用递归,将摆放在左边的数组和右边的数组在进行一次上述的1和2操作。
// 1. https://segmentfault.com/a/1190000017814119
//  递归结束
// 左数组 右数组，递归排序，最后concat在遗爱 

 function quickSort(arr) {
     if (arr.length <= 0 ) {
         return arr
     }
     let leftArr = []
     let rightArr = []
     let pivot = arr.splice(0, 1)[0]
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