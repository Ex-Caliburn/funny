// break,return 都可以退出循环，break退出还会执行当次循环break后的语句 break 后面不能加return 
for (var i = 0; i <3; i++) {
    if(i ==1){
        return
        break;
        console.log(i)
        return
    }
    console.log(i);
}