function countdown(times, returnfn) {
  var days = Math.floor(times / 86400);
  var hourtime = times - days * 86400;
  var hours = Math.floor(hourtime / 3600);
  var mintime = hourtime - hours * 3600;
  var minutes = Math.floor(mintime / 60);
  var second = mintime - minutes * 60;
  if (times < 0) {
    returnfn();
    return;
  } else {
    if (days < 10) {
      days = '0' + days;
    }
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    if (second < 10) {
      second = '0' + second;
    }
    if (days > 0) {
      return days + ":" + hours + ":" + minutes + ":" + second;
    } else if (hours > 0) {
      return hours + ":" + minutes + ":" + second;
    } else {
      return minutes + ":" + second;
    }
  }
}