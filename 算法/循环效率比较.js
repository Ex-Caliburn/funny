num = 10000000
sum = 0
console.time(1)
while (num > 0) {
    sum +=num 
    num--
}
console.timeEnd(1)
console.log(sum)

sum = 0
console.time(2)
for (num = 10000000; num >0; num--) {
    sum +=num 
}
console.timeEnd(2)
console.log(sum)

// for 循环稍微比 while 快个10%，并没有那么明显的差距，当然10%，时间越大，差距越大