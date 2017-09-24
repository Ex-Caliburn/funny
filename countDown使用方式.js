// 达成一定的约定，传入时间戳或者遵循一定格式的日期，safari有bug，
function showCountdown(start_countDown_time,start_time,end_time){
  // 起始时间时间戳
  if(new Date().getTime() >= new Date(start_countDown_time).getTime()){
    countdown({
      'classDay' : 'lottery-day',
      'classHour' : 'lottery-hour',
      'classMin' : 'lottery-min',
      'classSec' : 'lottery-sec',
      'dayshow' : true,
      'oneday' : false,
      'end':[end_time],
      // 回调函数
      'notStartHtml':function(){
        // 初始化
        //$(".lottery-hour").parents(".lottery-explain").removeClass("lottery-cutdown").html("1月8日使用")
        $(".ing").show();
      },
      'callbacking':function(){
        $(".lottery-hour").parents(".lottery-explain").removeClass("lottery-cutdown").html("立即使用").addClass("lottery-red").next().removeClass("cut-jiao").addClass("red-jiao");
        $(".ing").show();
      },
      'callback':function () {
        $(".lottery-hour").parents(".lottery-explain").removeClass("lottery-cutdown").html("立即使用").addClass("lottery-red").next().removeClass("cut-jiao").addClass("red-jiao");
      },
      'lastday':function () {
        $(".lottery-hour").parents(".lottery-explain").removeClass("lottery-cutdown").html("今日可使用").addClass("lottery-red").next().removeClass("cut-jiao").addClass("red-jiao");
      }
    });
  }else{
    // 还没到倒计时时间
    $(".lottery-hour").parents(".lottery-explain").removeClass("lottery-cutdown").html("5月8日使用").next().removeClass("cut-jiao")
  }
// 截止时间时间戳
  if(new Date().getTime() >= new Date(end_time).getTime()){
    $(".ing").hide();
    $(".oneExplain").removeClass("lottery-cutdown lottery-red").html("已过期").next().removeClass("cut-jiao red-jiao")

  }

}