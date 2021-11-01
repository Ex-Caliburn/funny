// promise 各种方法尝试

function fn1(params) {
  return new Promise((resolve, rejects) => {
    setTimeout(() => {
      resolve("fn1");
    }, 100);
  });
}
function fn2(params) {
  return new Promise((resolve, rejects) => {
    rejects("fn2");
  });
}
function fn3(params) {
  return new Promise((resolve, rejects) => {
    resolve("fn3");
  });
}

// Promise.all([fn1(), fn3()])
//   .then(res => {
//     console.log("全部成功返回按顺序返回数组", res);
//   })
//   .catch(err => {
//     console.log(err);
//   });

// Promise.all([fn1(), fn2(), fn3()])
//   .then(res => {
//     console.log(res);
//   })
//   .catch(err => {
//     console.log("有一个失败的就立马返回失败的", err);
//   });

// Promise.race([fn1(), fn3()])
//   .then(res => {
//     console.log("第一个成功就立马返回", res);
//   })
//   .catch(err => {
//     console.log(err);
//   });

// Promise.race([fn1(), fn2(), fn3()])
//   .then(res => {
//     console.log(res);
//   })
//   .catch(err => {
//     console.log("第一个失败就立马返回", err);
//   });

// Promise.any([fn2()])
//   .then(res => {
//     console.log(res);
//   })
//   .catch(err => {
//     console.log("没有成功的", err);
//   });

// Promise.any([fn1(), fn2()])
//   .then(res => {
//     console.log("有成功就立马返回，不管失败的", res);
//   })
//   .catch(err => {
//     console.log(err);
//   });

Promise.allSettled([fn1(), fn3()])
  .then(res => {
    console.log("全部完成返回，不管是成功还是失败，按顺序", res);
  })
  .catch(err => {
    console.log(err);
  });

Promise.allSettled([fn1(), fn2(), fn3()])
  .then(res => {
    // [
    //   { status: "fulfilled", value: "fn1" },
    //   { status: "rejected", reason: "fn2" },
    //   { status: "fulfilled", value: "fn3" },
    // ];
    console.log("全部完成返回，不管是成功还是失败，按顺序", res);
  })
  .catch(err => {
    console.log(err);
  });
