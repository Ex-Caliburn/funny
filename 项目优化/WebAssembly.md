# WebAssembly

## 前言

2012年，Mozilla 的工程师 Alon Zakai 在研究 LLVM 编译器时突发奇想：许多 3D 游戏都是用 C / C++ 语言写的，如果能将 C / C++ 语言编译成 JavaScript 代码，它们不就能在浏览器里运行了吗？众所周知，JavaScript 的基本语法与 C 语言高度相似。

于是，他开始研究怎么才能实现这个目标，为此专门做了一个编译器项目 Emscripten。这个编译器可以将 C / C++ 代码编译成 JS 代码，但不是普通的 JS，而是一种叫做 asm.js 的 JavaScript 变体。

本文就将介绍 asm.js 和 Emscripten 的基本用法，介绍如何将 C / C++ 转成 JS。

## 总结

asm.js 不仅能让浏览器运行 3D 游戏，还可以运行各种服务器软件，比如 Lua、Ruby 和 SQLite。 这意味着很多工具和算法，都可以使用现成的代码，不用重新写一遍。

另外，由于 asm.js 的运行速度较快，所以一些计算密集型的操作（比如计算 Hash）可以使用 C / C++ 实现，再在 JS 中调用它们。

### 参考文献

1. <http://www.ruanyifeng.com/blog/2017/09/asmjs_emscripten.html>
