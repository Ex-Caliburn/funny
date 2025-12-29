// Node.js的fs模块只提供了删除文件unlink夹及目录rmdir的功能，所以一起删除需要我们遍历删除，代码如下
var fs = require('fs'); // 引入fs模块

function deleteall(path) {
    var files = [];
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index) {
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse  
                deleteall(curPath);
            } else { // delete file  
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

// 使用
deleteall("./dir")//将文件夹传入即可