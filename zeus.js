const axios = require('axios');

exports.requireSSO = function(req,res,next){
    let ssoURL="http://192.168.5.61:8080";
    let url = req.protocol+"://"+req.headers.host;
    let zeusCookie = req.cookies.zeus;

    if(!zeusCookie){  
        res.redirect(ssoURL+"/auth?redirect="+url);
        return;
    }
    
    axios.get(ssoURL+"/check?url="+url+"&token="+zeusCookie)
    .then(function (response) {
        // handle success
        console.log(response);
        if(response.data.code == 1){
            next();
        }else{
            res.redirect(ssoURL);
        }
    })
    .catch(function (error) {
        res.sendStatus(500);
        console.log(error);
    });

}