// import '@babel/polyfill';
// 压缩js apple 应该在js 找不到了
const apple = 1;
console.log(apple);

const a = () => {
  console.log(2);
};
a();

const promise = new Promise((resolve) => {
  setTimeout(() => {
    console.log('定时器执行完了~');
    resolve(1);
  }, 10);
});

console.log(promise);
