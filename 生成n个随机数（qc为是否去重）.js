function fn(n,max,min,qc) {
  // 需求，生成n个随机数（qc为是否去重），返回一个随机数数组，可以设置随机数取值范围。
  // 判断是否为数字类型
  // 生成随机数
  // 判断是否重复
  // 健壮性，拓展性
  // 参数 随机个数，取值的max，min，是否开启去重
  // 判断如果开启了去重max-min

  if( arguments.length === 0 || typeof n !== 'number' && typeof n !== 'string'){
    return []
  }
  // 用户输入效验
  if(qc && (max-min+1)<n){
    return []
  }

  n = + n
  n =parseInt(n)
  // 默认值
  var scale = 32;
  var res = [];
  console.log(arguments.length);
  if(arguments.length>1){
    var tail = min ? min : 0 ;
    // if(arguments.length===2){
    //   tail = 2;
    // }
    scale = max-tail;
  }
  var num = 0
  var temp = {}
  for (var i = 0; res.length< n; i++) {
    num = Math.round(Math.random()*scale + tail);
    if(qc){
      if(!temp[num]){
        temp[num] = num
        res.push(num)
      }
    }else{
      res.push(num)
    }
  }
  return res
}

// console.log(fn('32.7687687'));
// console.log(fn(11,11,1,true));
// console.log(fn(11,11,1));
// console.log(fn(11,11,2));
console.log(fn(11,12,null,true));