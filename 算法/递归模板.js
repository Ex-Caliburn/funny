const recursion = (level, params) => {
  // recursion terminator
  if (level > MAX_LEVEL) {
    // process_result
    return
  }
  // process current level
  process(level, params)
  //drill down
  recursion(level + 1, params)
  //clean current level status if needed
}

// 一：递归函数分为四部分：1.终止条件 2.处理当前层逻辑代码 3.下探到下一层 4.清理当前层
// 二：递归3要点：1.不要人肉递归 2.寻找最近重复性 3.利用数学归纳法