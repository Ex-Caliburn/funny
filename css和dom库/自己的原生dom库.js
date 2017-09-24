// div是具有class =“foo bar”的<div>元素的对象引用
div.classList.remove("foo");
div.classList.add("anotherclass");

// 如果visible被设置则删除它，否则添加它
div.classList.toggle("visible");

// 添加/删除 visible，取决于测试条件，i小于10
div.classList.toggle("visible", i < 10);

alert(div.classList.contains("foo"));

//添加或删除多个类
div.classList.add("foo","bar");
div.classList.remove("foo", "bar");

var dom = document;

function addClass(dom,classList) {
    dom.querySelectAll(dom)[0]
}