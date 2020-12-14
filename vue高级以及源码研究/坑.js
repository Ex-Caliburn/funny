obj: {
    type: Object,
    required: true,
    default: () => {}
  }

//   obj我们期望是一个对象
//   默认其实是undefined， () => {} 返回是undefined，{} 不会当作是对象处理，而是函数块