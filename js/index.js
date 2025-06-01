//1日1回 注意表示
today = new Date();
y = today.getFullYear();m = today.getMonth();d = today.getDate();
ymd = (y-2024)*400+m*31+d;
date_key = localStorage.getItem("date_key")
if(date_key != ymd){
    localStorage.setItem("date_key",ymd)
    document.getElementById("caution").innerHTML = "<div class=\"frame frame-red\"><div class=\"frame-title caution\">⚠注意</div><p>こちらは限定公開のページです。ページ作成者本人の許可なく、外部へURLを共有したりページを無断転載することを禁じます。</p></div>"
}


//Single5000点 裏世界入口
myrecord = localStorage.getItem("my_1record");
if(myrecord==5000){
    document.getElementById("another_world_entrance").innerHTML = "</center><a href=\"fJpMDEXFiMwi5K3BeAWDsOvWGeNQ7X4lSHYOUf3eNhViTPUPgFVQXY4qoyEJYTYKEGQy0hC8XNptFRRVi8ShvneDkxMtMJaqHHNa.html\" class=\"btn-square btn1\" style=\"background-color: #000000; color: #ffffff;\">裏世界</a>" 
    
}

//AO5 4950点以上バッジ
Ao5record = localStorage.getItem("my_ao5record");
if(Ao5record>=4990){
    document.getElementById("title_image").src="img/RgbGuessrGod.jpg"

}else if(Ao5record>=4950){
    document.getElementById("title_image").src="img/RgbGuessrPro.jpg"
} 

// PB表示

// myrecord = localStorage.getItem("my_1record");
// if(myrecord==null){

// }else{
//     document.getElementById("my_1record").innerText = "Single:"+myrecord+"点  "
// }

Ao5record = localStorage.getItem("my_ao5record");
if(Ao5record==""||Ao5record==null){
    
}else{
    document.getElementById("my_ao5record").innerText = Ao5record+"点";
}

// myrecord2 = localStorage.getItem("2my_1record");
// if(myrecord2==null){

// }else{
//     document.getElementById("2my_1record").innerText = "Single:"+myrecord2+"点  "
// }

Ao5record2 = localStorage.getItem("2my_ao5record");
if(Ao5record2==""||Ao5record2==null){
    
}else{
    document.getElementById("2my_ao5record").innerText = Ao5record2+"点";
}

stage_record = localStorage.getItem("4stage_record");
if(stage_record!=null){
    document.getElementById("stage_record").innerText ="ステージ"+stage_record;
}