// break,return 都可以退出循环，break退出还会执行当次循环break后的语句
function aa() {
    for (var i = 0; i <3; i++) {
        if(i ==1){
            // break;
            return 1,-1
        }
        console.log(i);
    }
}

var timer1 = setInterval(function () {
    console.log(1);
},5000)
var timer2 = setInterval(function () {
    console.log(2);
//             未完成就清除掉了
    clearInterval(timer1)
},1000)