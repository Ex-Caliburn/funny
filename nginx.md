### gizp

gzip on;  #是否开启
gzip_min_length 1k; 最小压缩大小
gzip_buffers 4 16k;
gzip_http_version 1.0;
gzip_comp_level 1;  #压缩级别:1-10，数字越大压缩的越好，时间也越长
gzip_types text/plain application/javascript  text/javascript image/jpeg image/gif image/png;
gzip_vary on;
gzip_disable "MSIE [1-6]\."; #不使用gzip IE6

坑1: 我开启 gzip，gzip_types 没设置，设置了还是出不来，但是js和css，Content-Encoding: gzip也没有出现， 迟迟不生效 gzip_types 的顺序导致的
application/x-javascript 必须在 application/javascript后面，查了application/x-javascript是实验，已废弃，设置之后js 好了，css 还是不行，
上stackflow 发现 是我设置了gzip_min_length 1k，这个是只压缩大于1k的文件，css小于这个所以压缩

gzip_static
开启之后，会使用相同名称的.gz 文件，不会占用服务器的 CPU 资源去压缩


坑1:这个设置我在本地有缓存或者延迟性，你从gzip_comp_level 2到1，文件还是2时的压缩文件，除非你关闭gzip重新开启
