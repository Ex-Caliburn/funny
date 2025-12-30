a = '&lt;script src="https://cdn.bootcdn.net/ajax/libs/vue/3.0.0-beta.15/vue.cjs.js"&gt;&lt;/script&gt;'

b= a.replace(/(&lt;)(.+?)/g, ($0,$1,$2,$3) => {
    console.log($0,$1,$2, $3)
    return '<' + $2
}).replace(/(.+?)(&gt;)/g, ($0,$1,$2,$3) => {
    console.log($0,$1,$2, $3)
    return $1 +  '>'
})
console.log(b)
