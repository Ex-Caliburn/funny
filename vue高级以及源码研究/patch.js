var baseModules = [
    ref,
    directives
  ];

  var platformModules = [
    attrs,
    klass,
    events,
    domProps,
    style,
    transition
  ];

  var nodeOps = /*#__PURE__*/Object.freeze({
    createElement: createElement$1,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    setSt
  
  
  // the directive module should be applied last, after all
  // built-in modules have been applied.
  var modules = platformModules.concat(baseModules);
  
  var patch = createPatchFunction({ nodeOps: nodeOps, modules: modules });