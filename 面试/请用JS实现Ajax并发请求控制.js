// 实现一个批量请求函数 multiRequest(urls, maxNum)，要求如下：
// • 要求最大并发数 maxNum
// • 每当有一个请求返回，就留下一个空位，可以增加新的请求
// • 所有请求完成后，结果按照 urls 里面的顺序依次打出

function multiRequest(urls, maxNum){
    let arr = urls
    let waitArr = urls.splice(maxNum)
    let promise = Axios.get(urls.shift())
}

function ajax() {
    let xhr = new XMLHttpRequest()
    xhr.
}