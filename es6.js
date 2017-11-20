// 'use strict'

// const [a,b,c] = 'hello';
// console.log(a,b,c);


var obj = {
    "code": 0,
    "msg": "",
    "resp": [
        {
            "matches": [
                {
                    "date": "10月26日",
                    "week": "周三",
                    "season": "",
                    "sport": "两场比赛",
                    "matches": [
                        {
                            "period_id": "20020171107301",
                            "game_id": "2",
                            "plays": [
                                {
                                    "play_code": "1",
                                    "play_name": "全场让分胜负"
                                }
                            ]
                        },
                        {
                            "period_id": "20020171107302",
                            "game_id": "2",
                            "plays": [
                                {
                                    "play_code": "2",
                                    "play_name": "全场让分胜负"
                                }
                            ]
                        }
                    ]
                },
                {
                    "date": "10月27日",
                    "week": "周四",
                    "season": "",
                    "sport": "一场比赛",
                    "matches": [
                        {
                            "period_id": "20020171107303",
                            "game_id": "2",
                            "plays": [
                                {
                                    "play_code": "1",
                                    "play_name": "全场让分胜负"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

for (var i = 0; i < obj.resp[0].matches.length; i++) {
    var item = obj.resp[0].matches[i]
    for (var j = 0; j < item.matches.length; j++) {
        var subItem = item.matches[j];
        if(subItem.plays[0].play_code != 2){
            item.matches.splice(j,1)
        }
    }
}
console.log(obj);
console.log(JSON.stringify(obj));

