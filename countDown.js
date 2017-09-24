(function () {
  function countdown(config) {
    var startDate = config.start ? new Date(config.start) : new Date();
    for (var i = 0; i < config.end.length; i++) {
      if (i == 0) {
        config.notStartHtml()
      } else {
        config.callbacking();
      }
      //console.log(config.end[i].substring(0,4),config.end[i].substring(5,7)-1,config.end[i].substring(8,10))
      var nums = new Date(config.end[i].substring(0, 4), config.end[i].substring(5, 7) - 1, config.end[i].substring(8, 10), config.end[i].substring(11, 13), config.end[i].substring(14, 16))
      var num = (nums - new Date(startDate)) / 1000;
      // console.log(num)
      if (num > 0) {
        break;
      }
    }
    var endDate = nums;
    var id = config.id || 'countdown';
    var classDay = config.classDay;
    var classHour = config.classHour;
    var classMin = config.classMin;
    var classSec = config.classSec;
    var dayshow = config.dayshow;
    var oneday = config.oneday;
    var time = (endDate - startDate) / 1000;

    if (time < 86400 && time > 0) {
      if (config.lastday) {
        config.lastday();
        return;
      }
    }

    if (time < 0 || isNaN(time)) {
      if (config.callback) {
        config.callback();
      }
      return;
    }


    var day = parseInt(time / 86400, 10);
    var hour = parseInt(time % 86400 / 60 / 60, 10);
    var minute = parseInt(time % 86400 % 3600 / 60, 10);
    var second = parseInt(time % 86400 % 3600 % 60, 10);
    var mayday = '';
    if (dayshow) {
      mayday = day < 10 ? '0' + day : day;
    }
    // alert(Number(mayday));
    if (oneday) {
      if (Number(mayday) == 0) {
        mayday = '';
      }
    }
    var mayhour = hour < 10 ? '0' + hour : hour;
    var mayminute = minute < 10 ? '0' + minute : minute;
    var maysecond = second < 10 ? '0' + second : second;
    setTimeout(function () {
      try {
        document.getElementById(id).innerHTML = mayday + mayhour + ':' + mayminute + ':' + maysecond;
      } catch (e) {
        document.getElementById(classDay).innerHTML = mayday;
        document.getElementById(classHour).innerHTML = mayhour;
        document.getElementById(classMin).innerHTML = mayminute;
        document.getElementById(classSec).innerHTML = maysecond;
      }
      countdown(config);
    }, 1000);
  }

  window.countdown = countdown;
})();
