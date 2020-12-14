setTimeout(() => {
    console.log(1)
    setTimeout(() => {
        console.log(5)
    },0)
    new Promise((resolve) => {
        console.log(6)
        resolve()
    }).then(() => {
        console.log(7)
    })
    new Promise((resolve) => {
        console.log(8)
        resolve()
    }).then(() => {
        console.log(9)
    })
},0)
setTimeout(() => {
    console.log(2)
},0)
new Promise((resolve) => {
    console.log(3)
    resolve()
}).then(() => {
    console.log(4)
})
// Promise.resolve().then(() => {
//     console.log(4)
// })