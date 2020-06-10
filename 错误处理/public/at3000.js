const btn3k = document.querySelector('#btn-3000');
btn3k.addEventListener('click', () => {
  throw new Error('Fail 3000');
});