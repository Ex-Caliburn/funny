# pdfjs

## 前言

### demo

file 预览

```js
fileChange(e) {
      console.log(e.target, e.target.files)
      var reader = new FileReader()
      reader.onload = (e) => {
        this.pdfSrc = e.target.result
        console.log(this.pdfSrc)
      }
      reader.readAsDataURL(e.target.files[0])
    }
```

## 总结

### 参考文献
