// 检测是否有 render， 如果是 vue-Runtime 的化， vue-loader 已经把这部分工作完成， 如果是 Runtime+Compiler 版本会有  compileToFunctions
// 将html转换为 render 函数

// 我们在使用 Runtime Only 版本的 Vue.js 的时候，通常需要借助如 webpack 的 vue-loader 工具把 
// .vue 文件编译成 JavaScript，因为是在编译阶段做的，所以它只包含运行时的 Vue.js 代码，因此代码体积也会更轻量。 
// 在将 .vue 文件编译成 JavaScript的编译过程中会将组件中的template模板编译为render函数，所以我们得到的是render函数的版本。
// 所以运行的时候是不带编译的，编译是在离线的时候做的。

// 1 挂载
// $options.render 存在 就需要再做一次了
// 如果template属性存在， 并且template 是个 #开头id字符串
// template 不存在 el存在，nodetype 是节点 拿到 el.outerHTML，字符串,如下

```
"<div id="app">
    {{test}}
  </div>"
```

var ref = compileToFunctions();

// 检验是否有CSP 限制
// detect possible CSP restriction
try {
    new Function('return 1');
  } catch (e) {
    if (e.toString().match(/unsafe-eval|CSP/)) {
      warn$$1(
        'It seems you are using the standalone build of Vue.js in an ' +
        'environment with Content Security Policy that prohibits unsafe-eval. ' +
        'The template compiler cannot work in this environment. Consider ' +
        'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
        'templates into render functions.'
      );
    }
  }

  new Function('return 1'); // 会生成一个匿名函数 关键
//   ƒ anonymous(
//     ) {
//     return 1
//     }

// compile  render 会变成 "with(this){return _c('div',{attrs:{"id":"app"}},[_v("\n    "+_s(test)+"\n  ")])}"
// 具体步骤太深了 ast
var compiled = compile(template, options);

// 很深了
function generate (
    ast,
    options
  ) {
    var state = new CodegenState(options);
    // 生成 js 字符串 _o() _c() 这种 
    var code = ast ? genElement(ast, state) : '_c("div")';
    console.log(state, code)
    return {
      render: ("with(this){return " + code + "}"),
      staticRenderFns: state.staticRenderFns
    }
  }

// 用函数包裹起来
res.render = createFunction(compiled.render, fnGenErrors);


function createFunction (code, errors) {
    try {
      return new Function(code)
    } catch (err) {
      errors.push({ err: err, code: code });
      return noop
    }
  }
  // 返回
var render = ref.render;
var staticRenderFns = ref.staticRenderFns;
options.render = render;
options.staticRenderFns = staticRenderFns;


Vue.prototype.$mount = function (
    el,
    hydrating
  ) {
    el = el && query(el);

    var options = this.$options;
    // resolve template/el and convert to render function
    if (!options.render) {
      var template = options.template;
      if (template) {
        if (typeof template === 'string') {
          if (template.charAt(0) === '#') {
            template = idToTemplate(template);
            /* istanbul ignore if */
            if (!template) {
              warn(
                ("Template element not found or is empty: " + (options.template)),
                this
              );
            }
          }
        } else if (template.nodeType) {
          template = template.innerHTML;
        } else {
          {
            warn('invalid template option:' + template, this);
          }
          return this
        }
      } else if (el) {
        template = getOuterHTML(el);
      }
      if (template) {
        /* istanbul ignore if */
        if (config.performance && mark) {
          mark('compile');
        }

        var ref = compileToFunctions(template, {
          outputSourceRange: "development" !== 'production',
          shouldDecodeNewlines: shouldDecodeNewlines,
          shouldDecodeNewlinesForHref: shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        }, this);
        var render = ref.render;
        var staticRenderFns = ref.staticRenderFns;
        options.render = render;
        options.staticRenderFns = staticRenderFns;

        /* istanbul ignore if */
        if (config.performance && mark) {
          mark('compile end');
          measure(("vue " + (this._name) + " compile"), 'compile', 'compile end');
        }
      }
    }
    return mount.call(this, el, hydrating)
  };

  var idToTemplate = cached(function (id) {
    var el = query(id);
    return el && el.innerHTML
  });