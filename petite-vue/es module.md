# es module

## 前言

<https://caniuse.com/es6-module-dynamic-import>

可见ie全军覆没，移动端浏览器 uc、baidu等不支持。

## 总结

build.target配置可以选择浏览器版本，参考esbuild.target配置，但是还是不支持ie兼容低版本如果要支持低版本浏览器可以

使用官方提供的插件 @vitejs/plugin-legacyplugin-legacy 会将代码打包两套如果浏览器支持 <script type="module">则使用原生ESM加载，引入index.[hash].js，代码里使用import导入文件如果浏览器不支持E

### 参考文献
