# $set

## 前言

vmCount 只有在 _data 上有

1. 判断值是否有效
2. 是否是数组，key值是否是有效，使用splice
3. 如果是已经存在的属性，并且不在prototype上，直接赋值,并会触发该属性的set方法
4. targe的是vue实例或者有 __ob__ 并且 ， 避免添加响应式对象绑定在 vue实例或者$data上，应该在实例data中声明
5. 如果没有__ob__属性,说明没有添加过数据绑定，直接赋值
6. 最后处理, 添加数据绑定，并且通知

```js
/**
* Set a property on an object. Adds the new property and
* triggers change notification if the property doesn't
* already exist.
   */
  function set (target, key, val) {
    if (isUndef(target) || isPrimitive(target)
    ) {
      warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
    }
    if (Array.isArray(target) && isValidArrayIndex(key)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val
    }
    if (key in target && !(key in Object.prototype)) {
      target[key] = val;
      return val
    }
    var ob = (target).__ob__;
    if (target._isVue || (ob && ob.vmCount)) {
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
        'at runtime - declare it upfront in the data option.'
      );
      return val
    }
    if (!ob) {
      target[key] = val;
      return val
    }
    defineReactive$$1(ob.value, key, val);
    ob.dep.notify();
    return val
  }
```

## 总结

### 参考文献
