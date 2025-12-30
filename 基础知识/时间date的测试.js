


var match_time ="2017-04-12 20:30:00 +0800"

  var o ="04-12 20:30:00 +0800"
  var m = match_time.substring(5,7)
  var d = match_time.substring(8,10)
  var t = match_time.substring(10,16)
  var all = match_time.substring(5,16)

//   console.log(m,d,t,all);
// console.log('02'==2);
//   console.log(new Date().toTimeString());
//   console.log(new Date().toDateString());
//   console.log(new Date().toISOString());
//   console.log(new Date().toLocaleDateString());
//   console.log(new Date().toLocaleString());
//   console.log(new Date().toLocaleTimeString());
//   console.log(Date.now(),1111);
//   console.log(  new Date().toLocaleDateString().split('/')[0] == +m);
//   console.log(+d+1,m,+m);
  console.log(  new Date().toLocaleDateString());
  console.log(  new Date().toLocaleDateString().split('/')[1] == +d);
//   console.log(  new Date().toLocaleDateString().split('/')[1] == +d+1);
//   console.log(  new Date().toLocaleDateString().split('/'));
//
//   console.log(new Date());


  // var birthday =;
  console.log( new Date('2017-04-12 20:30:00 +0800').getTime());
  // console.log( new Date('2017-04-12 20:20:00').getTime());

  // console.log( new Date("December 17, 1995 03:24:00"));
  // var birthday = new Date("1995-12-17T03:24:00");
  // var date = new Date(2013,08,30);
  // console.log(new Date('2013','08','30').getTime());

  // console.log(new Date('2017-04-12 15:49:00 +0800').getTime()-Date.now()<30*60*1000);
