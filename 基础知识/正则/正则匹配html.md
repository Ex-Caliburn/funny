### 匹配html
标签有闭合标签<p></p> <br></br>
有非闭合标签 <image /> <br/>
有非闭合标签不带/ <image /> <br>

要排除数字标签 <1>


最终结果 匹配非数字标签 只要是闭合不管带不带/
```
/<[^\d]+[^>]*>/img
```


### 参考文献
1. https://www.baidufe.com/item/eb10deb92f2c05ca32cf.html