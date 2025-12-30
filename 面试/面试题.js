/* class Manager {
  constructor(max) {
    this.max = max
  }

  add(fn) {
    // fn: () => Promise<any>
    // TODO
  }
}

const m = new Manager(2)
m.add(fn1) // 1000  a
m.add(fn2) // 500  b
m.add(fn3) // 300  c 
*/

// 0  start
// 500  b
// 800  c
// 1000  a

// 我的答案

class Manager {
  constructor(max) {
    this.max = max
    this.count = 0
    this.executeArr = []
  }

  add(fn) {
    if (this.count + 1 >= this.max) {
      this.executeArr.push(fn)
    } else {
      this.execute(fn)
    }
  }

  execute(fn) {
    this.count++
    fn().then(() => {
      this.count--
      if (this.executeArr.length) {
        this.execute(this.executeArr.shift())
      }
    })
  }
}

const m = new Manager(2)

timer = (str, time) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(str, Date.now())
      resolve()
    }, time)
  })
}
m.add(timer.bind(null, 'a', 1000)) // 1000  a
m.add(timer.bind(null, 'b', 500)) // 500  b
m.add(timer.bind(null, 'c', 300)) // 300  c

a = document.createElement('div')
console.log(a)
