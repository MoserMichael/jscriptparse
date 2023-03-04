
const bs = require('rtbase.js');

function addExtension(frame) {
    frame.defineVar(

        "consoleLog", new bs.BuiltinFunctionValue(`#log all arguments to console to console
3`, -1, function(arg) {

        let res_str = "";

        for(let i=0; i<arg.length; ++i) {
            if (i > 0) {
                res_str += " ";
            }
            res_str += bs.value2Str(arg[i]);
        }

        console.log(res_str);

        return new bs.Value(bs.TYPE_NUM, res_str.length);
    }) 
    );

}

module.exports = {
  addExtension  
};

