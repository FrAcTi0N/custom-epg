let log = (function(){
  let loggers = {};
  let consoleAppender = {
    severity:3,
    shardId:false
  };
  let logOn = true;
  let severityList = ["DEBUG","INFO","WARNING","ERROR"];
  let logPath;
  let fs;
  let serverPath;
  
  let obj = {};
  obj.getLogger = getLogger;
  obj.setLogOff = setLogOff;
  obj.setSeverity = setSeverity;
  obj.setLogPath = setLogPath;
  obj.setShardId = setShardId;
  obj.getShardId = getShardId;

  //obj.file = logToFile;
  
  function setLogPath(_lp,_serverPath) {
    logPath = _lp;
    fs = require("fs");
    serverPath = _serverPath;
  }
  
  function pad(s) { 
    return (s < 10) ? '0' + s : s; 
  }
  
  function dateToString(d) {
    return [d.getUTCFullYear(), pad(d.getUTCMonth()+1), pad(d.getUTCDate())].join('-') + "_" + pad(d.getUTCHours()) +":"+ pad(d.getUTCMinutes())+":"+pad(d.getUTCSeconds());
  }
    
  function getLogger(logger) {
    if (typeof loggers[logger] === 'undefined') {
      loggers[logger] = createLogger(logger);
    }
    return loggers[logger];
  };
  
  function setLogOff() {
    logOn = false;
  }
  
  function setSeverity(severity){
    consoleAppender.severity = severity;
  };

  function setShardId(shardId) {
    consoleAppender.shardId = ""+shardId;
  }

  function getShardId() {
    return consoleAppender.shardId;
  }
  
  function createLogger(logger) {
    let loggername = logger;
    let obj = {};
    //obj.newLog = newLog;
    obj.info = info;
    obj.error = error;
    obj.warn = warn;
    obj.debug = debug;
    obj.file = file;
    
    function logMsg(_severity) {
      let severity = _severity;
      if (logOn && severity >= consoleAppender.severity) {
        //console.log("LOGGER: logMsg: Type of consoleAppender.shardId",typeof consoleAppender.shardId);
        arguments['0'] = `[${severityList[severity]}] [${dateToString(new Date())}] [${typeof consoleAppender.shardId === 'string'?consoleAppender.shardId+'|':''}${loggername}]:`;
        console.log.apply(this, arguments);
      }
    }

    function info() {
      let args = Object.values(arguments);
      args.splice(0,0,1);
      logMsg.apply(this,args);
    };
    
    function debug() {
      let args = Object.values(arguments);
      args.splice(0,0,0);
      logMsg.apply(this,args);
    };
    
    function warn() {
      let args = Object.values(arguments);
      args.splice(0,0,2);
      logMsg.apply(this,args);
    };
    
    function error() {
      let args = Object.values(arguments);
      args.splice(0,0,3);
      logMsg.apply(this,args);
    };
    function file(msg) {
      logToFile(msg);
    };
    
    function logToFile(err){
    fs.writeFile(serverPath+"logs/" +dateToString(new Date()) +"-" + loggername + ".log",err, function (err) {
    if (err) throw err;
    //log.debug('File is created successfully.');
    });     
    }
    return obj;
  };
  

  
  return obj;
})();

module.exports = log;