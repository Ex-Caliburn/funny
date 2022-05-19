let promiseALl = async (arr) => {
  let res = [];
  try {
    for (let iterator of arr) {
      console.log(iterator, 'start')
      res.push(await iterator());
      console.log(iterator, 'end')
    }
    return res;
  } catch (error) {
    return Promise.reject(error);
  }
};

function execute(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(time);
    }, time);
  });
}

function execute2(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(11);
    }, time);
  });
}

promiseALl([
  execute.bind(null, 3),
  execute2.bind(null, 3),
  execute.bind(null, 2),
])
  .then((res) => {
    console.log(222, res);
  })
  .catch((err) => {
    console.log(111, err);
  });

// for 中不能掉用  async async中是同步，只有await 是异步
// promiseALl2 不是 async 包裹，就无法用then 处理


  let promiseALl2 =  (arr) => {
    let res = [];
    try {
      for (let iterator of arr) {
        async function job(iterator) {
          console.log(iterator, 'start')
          res.push(await iterator());
          console.log(iterator, 'end')
        }
        job(iterator)
      }
      return res;
    } catch (error) {
      return Promise.reject(error);
    }
  };