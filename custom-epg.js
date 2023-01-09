/*
//import { csfd } from 'node-csfd-api';
const {csfd} = require("node-csfd-api");
console.log(csfd)

csfd.movie(660047).then((movie) => console.log(movie));
//sledovani tv can be used...
*/
//http://felixtv.wz.cz/epg/stv.php?ch=nova&d=2022-12-23
/*
we want to scrape:
directors
actors
descripton??? - asi bude stejny
year
country
genres (dont dorget to map it...)
rating
*/

//we miss some genres, for example for ctsport,
//  sledovanitv - false
//  sms.cz - false
//  

//XMLTV Grabbed from https://gitlab.com/jonohill/xmltv-skynz/-/blob/master/xmltv.js
const axios = require('axios');
//const prettify = require('html-prettify');
var JSSoup = require('jssoup').default;
const {csfd} = require("node-csfd-api");
//var convert = require('xml-js');
const XmlTv = require('./packages/xmltv');
//const fs = require("fs");
const Cache = require('file-system-cache').default
const cache = Cache({
  basePath: "./cache" // Optional. Path where cache files are stored (default).
});
const config = require('config');
const fs = require(`fs`)
const path = require("path");


//Load seetings from ./config/default.toml
let channelIds = config.get(`channelIds`)
//channelIds = ["ctdecko"]
//channelIds = ["fanda"]
//channelIds = ["primacomedy"];
//channelIds = ["ct24"]
//channelIds = ["ct1", "ct2", "ct24", "ctdecko", "ctart", "ct4sport"]
const channelsCTMap = {
  "ct1": "ct1",
  "ct2": "ct2",
  "ct24": "ct24",
  "ctdecko": "ct5",
  "ctart": "ct6",
  "ct4sport": "ct4"
}

const channelsPlusOne = config.get(`channelsPlusOne`);
const timezone = config.get(`timezone`);
const days = config.get(`days`);
const daysBack = config.get(`daysBack`);
const cacheFolder = `${__dirname}/cache`;
const xmlFileName = config.get(`xmlFileName`);
let epgXml;

//set logger
const Logger = require(`./packages/Logger.js`);
Logger.setSeverity(config.get(`logLevel`))
Logger.setLogPath(`./logger.log`,`./`);
let log = Logger.getLogger("MAIN");
  
  
main();

  async function main(){
    //log.debug("genres: ", genresMap.genres);
    //log.debug("uknown genres", genresMap.unknown);

    let startTime = new Date();
    log.info(`Channels: ${channelIds.length}`);
    log.info(`Days: ${days}`)
    log.info(`Days back: ${daysBack}`);
    log.info(`${timezone} timezone\n`);
    await cleanCache(); //we clean cache files first...
    //add header to xml
    const xml = new XmlTv({
        sourceInfoUrl: 'https://sledovanitv.cz/ott/welcome',
        sourceInfoName: 'sledovanitv.cz with csfd extended info'
    })

  	//get channels and add them to xml
  	channels = await getChannels();
    //log.info(`channels`, channels)
    //add channels to xml
    /*
    xml.addChannels(channels.map(c => ({
        id: c.id,
        displayNames: [c.name],
        icon: c.icon
    })));
    */
    for (let i in channels){
      //let channel = channels[i];
      let channel = {
        id: channels[i].id,
        displayNames: [channels[i].name],
        icon: channels[i].icon
      }
      xml.addChannel(channel);
      //we also want to add +1 channel
      if (channelsPlusOne.includes(channel.id)){
        channel.id = channel.id + `+1`;
        channel.displayNames[0] = channel.displayNames + "+1";//its and array and i dont want to solve it now..
        xml.addChannel(channel);
      }
    }

    //get programes for each channel and add them to xml
    //let tzString = await getTZString(timeshift);
    //we loop through all days...
    let dayLoops = days + daysBack;
    let dayDiff = -days;
    let firstDay = new Date(new Date().setDate(new Date().getDate()-daysBack));
    //log.info(`Start date: ${firstDay}, loops: ${dayLoops}`);
    //return;
    //we loop through desired days...
    for (let x = 0; x < dayLoops; x++){
      //let date = new Date(new Date().setDate(new Date().getDate()-dayDiff));
      //let date = firstDay + x;
      let date = new Date(new Date().setDate(new Date().getDate()-daysBack + x)); //first date + loop
      let timeshift = getOffset(date, timezone); //we get and offset for specifies timezone
      let offsetType = `+`;
      if (timeshift < 0 ){
        offsetType = `-`;
      }
      let dateString = date.toISOString().split('T')[0];
      let tzString = await getTZString(timeshift);
      dayDiff++;//we add plus one for next loop...
      //log.info(`\n\n${dateString}`);
      process.stdout.write(`\n\n${dateString} / offset ${offsetType}${timeshift} hour(s) / day ${x+1}/${dayLoops}`);
      //we loop throug all channels
      for (let i in channels){
        channel = channels[i];
        //log.info(`adding programmes for ${channel.name} on ${dateString}`);
        //log.info(`\n${channel.name} -`)
        process.stdout.write(`\n${channel.name} \t`)
        //get all programs for specific date
        let programmes = await getProgrammes(channel.id, dateString);
        //let CSTVXml;
        var CSTVSoup;
        if (channel.id in channelsCTMap){
          //we want to get xml from ceska televize for CT channels to get genres and rating...
          //log.info("CT program... get xml");
          let channelCT = channelsCTMap[channel.id]
          let dateCT = `${dateString[8]}${dateString[9]}.${dateString[5]}${dateString[6]}.${dateString[0]}${dateString[1]}${dateString[2]}${dateString[3]}`;
           
          //log.info(`${dateCT} ${channelCT}`);
          let channelXmlLink = `https://www.ceskatelevize.cz/services-old/programme/xml/schedule.php?user=test&date=${dateCT}&channel=${channelCT}`
  
          var CSTVXml = await getRequest(channelXmlLink, true);
          //log.info(CSTVXml);
          if (CSTVXml){
            CSTVSoup = new JSSoup(CSTVXml);
          }

        }
        //log.info("P", programmes)
        //will also want to add star rating, year, poster
        //log.info(programmes);
        for (let i in programmes){
          process.stdout.write(`-`)
          let programme = programmes[i];
          //if ("ctdecko" in k or "ctart" in k) and ("Přestávka ve vysílání" in title):
          if ((channel.id == `ctdecko` || channel.id == `ctart`) && programme.title.includes('Přestávka ve vysílání')){
            //we do not want to add this programme, because we merge these 2 epgs in tvheadend...
            continue;
          }
          //let stvProgSoup = await get stvProgSoup(programme.eventId);
          let CSTVInfo;
          if (CSTVSoup){
            CSTVInfo = await grabCSTV(CSTVSoup, programme);
          }
          
          let infoCSFD = await getProgrammeExtendedInfo(programme) || false;
          //map genres
          let genresCZ = infoCSFD.genres || [];
          //log.info("X", genresCZ);
          if (genresCZ.length < 1 && CSTVInfo?.genre){
            //log.info("gotcha")
            genresCZ.push(CSTVInfo?.genre)
          }
          let genresKodi = await mapGenres(genresCZ);
          //log.info(CSTVInfo)
          //log.info(genresCZ)
          //log.info(infoCSFD);
          //add episode number
          let episodeNum;
          //log.debug(infoCSFD)
          //log.debug(infoCSFD.episodeNum)
          /*if (infoCSFD && infoCSFD.episodeNum){
            let epNumMatchResult = infoCSFD.episodeNum.match(/S(\d+)\s?Ep?(\d+)/)
            if (epNumMatchResult) {
                episodeNum = {
                    system: 'xmltv_ns',
                    value: `${parseInt(epNumMatchResult[1]) - 1}.${parseInt(epNumMatchResult[2]) - 1}.0/0`
                }
              }
          }*/
          if (infoCSFD.csfd && infoCSFD.episodeNum){
            episodeNum = {
                    system: 'onscreen',
                    value: infoCSFD.episodeNum           
              }
            
          }
          //add poster
          let poster;
          if (infoCSFD.csfd && infoCSFD.poster){
            poster = {
                    type: 'poster',
                    value: infoCSFD.poster           
              }
          } else if (CSTVInfo?.poster){
            poster = {
                    type: 'poster',
                    value: CSTVInfo.poster           
              }
          }
          //log.debug(episodeNum)
          //get rating and add it to title
          if (infoCSFD.csfd && infoCSFD.rating){
            programme.title += ` (${infoCSFD.rating}%)`
          };
          //use csfd description if any
          //log.info("\n\nXXXX", programme.title);
          //log.info("STV", programme.description);
          //log.info("CSFD", infoCSFD);
          //log.error(infoCSFD.descriptions.length)
          if (infoCSFD.csfd && infoCSFD.descriptions && infoCSFD.descriptions.length > 0){
            //log.error(infoCSFD.descriptions);
            //jwe add just first csfd description
            programme.description = infoCSFD.descriptions[Object.keys(infoCSFD.descriptions)[0]];
          } else if (CSTVInfo?.description && !programme.description){
            //we add desc from cstv
            programme.description = CSTVInfo.description;
          }
          //log.info(programme.description)
          //!!!add extra info into programme.description HERE!!!
          let descFirsLine = "";
          if (infoCSFD.csfd && infoCSFD.episodeNum != null){
            descFirsLine = infoCSFD.episodeNum;
          }
          if (infoCSFD.csfd && infoCSFD.year){
            if (descFirsLine != ""){
              descFirsLine += ` - `
            }
            //lets add year to the first line
            descFirsLine = descFirsLine + infoCSFD.year;
          }
          //log.debug(genresCZ);
          if (genresCZ.length > 0){
            //lets add cz genres to first line
            //log.debug(`gonna add genres`)
            if (descFirsLine != ""){
              //there is already a year. lets add -
              descFirsLine += ` - `;
            }
            //lets loop through genres and add them
            for (let i in genresCZ){
              //log.debug(`adding ${genresCZ[i]}`)
              if (i > 0){
                descFirsLine = descFirsLine + `/`
              }
              descFirsLine = descFirsLine + genresCZ[i];
            }
          }
          if (descFirsLine){
            //add first line if there is any
            programme.description = `${descFirsLine}\n${programme.description}`
          }
          //add info after desc
          let descLastLine = "";
          if (infoCSFD.csfd && infoCSFD.creators.directors){
            //we add direcotors here
            let directors = infoCSFD.creators.directors;
            for (let i in directors){
              if ( i > 2){
                //we want to add max 3 directors
                break;
              }
              let director = directors[i];
              if (i == 0){
                descLastLine = descLastLine + `Directed by: `
              } else {
                descLastLine = descLastLine + ` / `
              }
              descLastLine = descLastLine + director.name
            }
          }
          if (infoCSFD.csfd && infoCSFD.creators.actors){
            if (descLastLine != ""){
              //we add a new line, if there is anything in last line...
              descLastLine = descLastLine + "\n"
            }
            //we add direcotors here
            let actors = infoCSFD.creators.actors;
            for (let i in actors){
              if ( i > 4){
                //we want to add max 5 actors
                break;
              }
              let actor = actors[i];
              if (i == 0){
                descLastLine = descLastLine + `Actors: `
              } else {
                descLastLine = descLastLine + ` / `
              }
              descLastLine = descLastLine + actor.name
            }
          }


          if (descLastLine != ""){
            //and finally add it here
            programme.description = programme.description + "\n" + descLastLine;
          }

          //we need to format time to xmltv format...
          programme.startTime = await formatTime(programme.startTime);
          programme.endTime = await formatTime(programme.endTime);
          //log.info("PXXXXXX", programme);
          //log.info("EXXXTRAAA", extra);
          let programmeToAdd = {
            "channel": channel.id,
            "start": programme.startTime + tzString,
            "stop": programme.endTime + tzString,
            "title": programme.title,
            "desc": programme.description,
            "date": programme.year,
            "categories": genresKodi,
            "rating":"",
            "episodeNum": episodeNum,
            "poster": poster
          };
          //and we finally ad it
          xml.addProgramme(programmeToAdd);
          //we also add +1 if needed
          let tzStringMinusOne = await getTZString(timeshift-1);
          if (channelsPlusOne.includes(channel.id)){
            programmeToAdd.channel = channel.id + "+1";
            programmeToAdd.start = programme.startTime + tzStringMinusOne;
            programmeToAdd.stop = programme.endTime + tzStringMinusOne;
            xml.addProgramme(programmeToAdd);
          }

        }

        /*
        xml.addProgrammes(programmes.map(p => ({
          "channel": channel.id,
          "start": p.startTime + tzString,
          "stop": p.endTime + tzString,
          "title": p.title,
          "desc": p.description,
          "date": p.year,
          "category": genres,
          "rating":"",
          "episode-num": p.season
        })));
        */
  /*
                   let xmlP = {
                  _attributes: {
                      channel: programme.channel,
                      start: this._formatDate(programme.start),
                      stop: this._formatDate(programme.stop),
                  },
                  title: p.title,
                  desc: p.desc,
                  date: p.date,
                  category: p.categories,
                  rating: p.rating,
                  'episode-num': p.episodeNum && {
                      _attributes: { system: p.episodeNum.system },
                      _text: p.episodeNum.value
                  }
              }
              */
        //process.stdout.write(`\n`);
      };
    };
    process.stdout.write(`\n\n`);


    //await channels2xml(channels);


    //xml = xml.toXml();
    let xmlFinal = await formatXml(xml.toXml());
    //save xml
    await fs.writeFileSync(`${__dirname}/${xmlFileName}`, xmlFinal);
    //log.info(``)
    log.info(`Epg saved to ${__dirname}/${xmlFileName}`);
    //let formattedXml = await formatXml(xmlFinal)
    //log.info(`xml`, xmlFinal)
    let duration = new Date() - startTime
    let durationString = new Date(duration).toISOString().slice(11,19)
    log.info(`Duration: ${durationString}`);
  	return;
  	
  }

function formatTime(_time){
  //we need to convert time to xmltv format
  //!!!!we need to solve TS here!!!!!
  //x["startTime"].replace("-", "").replace(" ", "").replace(":", "") + "00" + TS
  //let time = _time.replace("-", "").replace(" ", "").replace(":", "")+ "00" + TS;
  let time = _time.replaceAll("-", "").replace(" ", "").replace(":", "")+ "00";
  return time;
}

async function getProgrammeExtendedInfo(_stvInfo){
  //log.info(_stvInfo)
    //get CSFD link, false if not in stv page
    //let csfdProgUrl = await scrapeCSFDLink(_eventId);
    //log.info("X1" + _stvInfo.title);
    //log.info("XXX",  _stvInfo)
    let stvExtendedInfo = await scrapeCSFDLink(_stvInfo);
    //log.info(stvExtendedInfo);
    /*
    let stvProgPage = await getRequest(stvProgUrl, true);//we add true to save only csfd url in scrapeCSFDLink

    //extract csfd link, if anyh
    let soup = await new JSSoup(stvProgPage);
    //log.info("SOUP: ", soup)
    //return;
   
    let a = await soup.findAll("a");
    //log.info(`A: ${a}`);
    let csfdProgUrl = false;
    for (let i in a){
      //console.log(a[i].attrs)
      let atrs = a[i].attrs;
      if (atrs.href.includes(`https://www.csfd.cz`)){
        csfdProgUrl = atrs.href;
      }
    }
    */
    //let csfdTitleSearch = false;
    //if (!stvExtendedInfo.csfdLink){
    //  log.info("XXX",  _stvInfo)
    //}
    
    //if (!stvExtendedInfo.csfdLink && _stvInfo.title && _stvInfo.year){

    //log.info(stvExtendedInfo);
    if (!stvExtendedInfo.csfdLink){
      //log.info(`No CSFD link for ${stvProgUrl}`);
      //log.info(`X`)
      stvExtendedInfo.csfd = false;
      process.stdout.write(`X`)
      return (stvExtendedInfo);
    }
    //log.info("XXX", stvExtendedInfo);
    //we should have a csfd p_link
    //log.info(`csfd p: ${csfdProgUrl}`)
    //lets grab the exgtended info by csfd library
    let cached = await getCached(stvExtendedInfo.csfdLink);
    if (cached){
      //we already have csfd data cached, so just return it...
      //log.info(`C`);
      process.stdout.write(`C`)
      return (cached);
    }
    let progId = stvExtendedInfo.csfdLink.replace("https://www.csfd.cz/film/", "");
    progId = progId.split("/")[0].toString();
    progId = progId.split("-")[0].toString();
    progId = progId.replace("/","");
    //console.log("csfd progId: " + progId)
    let extendedInfo = false;
    try {
      extendedInfo = await csfd.movie(progId);
    } catch (e){
      process.stdout.write(`E`);
      return (stvExtendedInfo);
    }
    if (!extendedInfo?.poster && extendedInfo?.parentId){
      //we may have episode and to get the poster, we need to use parent id, that links to series...
      try {
        let parentId = extendedInfo?.parentId;
        while (parentId){
          //log.info("finding poster for " + parentId)
          let extendedInfoParrent = await csfd.movie(parentId) || null;
          //log.info("New parrent id: " + extendedInfoParrent.parentId);
          if (extendedInfoParrent?.poster){
            extendedInfo.poster = extendedInfoParrent.poster;
            break;
          } else {
            parentId = extendedInfoParrent.parentId || null;
          }
        }
        //log.info("P2", extendedInfo.poster);
      } catch (e){
        //nothing here...
      }
    }
    let dataToCache;
    if (extendedInfo){
      //new fetched CSFD data, lets save it into cache
      //log.info("N");
      process.stdout.write(`N`);
      dataToCache = {
        "csfd": true,
        "id": extendedInfo.id,
        "title": extendedInfo.title,
        "year": extendedInfo.year,
        "descriptions": extendedInfo.descriptions,
        "genres": extendedInfo.genres,
        "rating": extendedInfo.rating,
        "poster": extendedInfo.poster,
        "episodeNum": extendedInfo.episodeNum,
        "creators": extendedInfo.creators
      }
      //saveCached(csfdProgUrl, extendedInfo);
      saveCached(stvExtendedInfo.csfdLink, dataToCache);
    }
    return (dataToCache);
    //try {
//
  //  }
    //csfd.movie(progId).then((movie) => {console.log("XXX", movie); return(movie)});

}

async function scrapeCSFDLink(_stvInfo){
    let stvProgUrl = "https://sledovanitv.cz/epg/event-new?eventId=" + _stvInfo.eventId;
    let stvProgPage = await getRequest(stvProgUrl, true);//we add true to not save the page to cache, we will save only csfd link later here...
    if (stvProgPage.cached){
      //this is cached result
      if (stvProgPage.csfdLinkByTitle){
        process.stdout.write(`T`);
      }
      return (stvProgPage);
    };
    //this is not cached, so we need to extract CSFD page from the page and save just csfdLink

    //extract csfd link, if anyh
    let soup = await new JSSoup(stvProgPage);
    //log.info("SOUP: ", soup)
    //return;
   
    let a = await soup.findAll("a");
    //log.info(`A: ${a}`);
    let csfdProgUrl = false;
    for (let i in a){
      //console.log(a[i].attrs)
      let atrs = a[i].attrs;
      if (atrs.href.includes(`https://www.csfd.cz`)){
        csfdProgUrl = atrs.href;
      }
    }
    let stvInfo = _stvInfo;
    stvInfo.cached = true;
    stvInfo.csfdLink = false;
    //let dataToCache = {
    //  cached: true,
    //  csfdLink: false
    //}
    if (csfdProgUrl){
      //stvInfo.cached = true,
      stvInfo.csfdLink = csfdProgUrl;
    } else if (stvInfo.title){
      //we dont have csfdLink, so we try to find it by name and year...
      try {
        stvInfo.csfdLink = await getCsfdLinkByTitle(stvInfo.title, stvInfo.year)
        process.stdout.write(`T`);
        stvInfo.csfdLinkByTitle = true;
      } catch (e){
        //if for any reason we are unable to get csfd program info, we handle it as we dont have the csfd link...
        stvInfo.csfdLink = false;
      }
    }
    //we also add stv genres here --> we will use em if there is no csfd link...
    let genres = await getStvGenres(soup);
    stvInfo.genres = genres;
    //save to cache here...
    await saveCached(stvProgUrl, stvInfo);
    //and return the csfd link, if we got it...
    return (stvInfo);
}

async function getCsfdLinkByTitle(_title, _year){
  //log.info(`Looking for ${_title} / ${_year}`)
  //let name = "kašpárek";
  //let year = 1980
  let res = await csfd.search(_title);
  let movies = res.movies;
  //console.log(movies)
  let csfdLink;
  for (let i in movies){
    //console.log(`${movies[i].title}, ${movies[i].year}`);
    if (movies[i].title.toLowerCase() == _title.toLowerCase() && movies[i].year == _year){
      csfdLink = movies[i].url;
    }
  }
  //console.log(csfdLink)
  return (csfdLink);
}

async function getStvGenres(_soup){
  let divs = await _soup.findAll("div");
  let genresArray = [];
  //console.log("XXX", a);
  for (let i in divs){
        //console.log(a[i].attrs)
        let div = divs[i];
        //console.log("WWW", div.text);
        //if (div == "O pořadu"){
        if (div.text.startsWith("Tvůrci")){
          //console.log("XXX", div.text);
          let divGenres = div.previousSibling.previousSibling;
          let objectsArray = divGenres.text.split("\n");
          //we want to trim all objects
          objectsArray =  objectsArray.map(element => {
        return element.trim();
      });
      //remove empty objects
      let objecsArrayClear = []
      objectsArray.forEach(element => {
        if (Object.keys(element).length !== 0) {
          objecsArrayClear.push(element);
        }
      });
      //console.log("YYY", divGenres.text);
      //console.log("YYYxxx", objecsArrayClear);
      //we need to get genres only
      
      for (let j in objecsArrayClear){
        if (objecsArrayClear[j] == "/" && !genresArray.includes(objecsArrayClear[j-1]) && isNaN(objecsArrayClear[j-1])){
          //we add a genre that is in previous element if not already there, it must not be a number
          genresArray.push(objecsArrayClear[j-1]);
        }
        if (objecsArrayClear.length-1 == j && !genresArray.includes(objecsArrayClear[j]) && isNaN(objecsArrayClear[j])){
          //we add the last element as well if not already there, it must not be a number
          genresArray.push(objecsArrayClear[j]);
        }
      }
      //console.log("FFF", genresArray);
    }
        //console.log("XXX", atrs);
        //if (atrs.href.includes(`https://www.csfd.cz`)){
        //  csfdProgUrl = atrs.href;
        //}
  }
  //log.debug("XXX", genresArray);
  //for (let i in genresArray){
  //  log.debug(`${genresArray[i]}/${isNaN(genresArray[i])}`)
  //}
  return(genresArray);
}

 //const sendGetRequest = async () => {
 async function getRequest(_pLink, _noCache){
  //we check if we already have that page saved
  let cached = await getCached(_pLink);
  if (cached){
    //log.info(`C`);
    process.stdout.write(`C`);
    return (cached)
  }
  //if we dont have the page cached, we try to fetch it
  let page;
  let error;
  for (let i = 0; i < 5; i++){
    //we need to loop, beacuse we get error quite often...
    try {
        const resp = await axios.get(_pLink);
        //console.log(resp.data);
        //we have a new page, lets save it to cache
        if (!_noCache){
          //we save the page here and only for CSFD resultbecause we want to save space by saving only csfd link, so we will do it in scrapeCSFDLink
          await saveCached(_pLink, resp.data);
        }
        
        //log.info(`N`);
        //process.stdout.write(`N`);
        //return (resp.data);
        page = resp.data;
        break;//we jump out of loop...
    } catch (err) {
      // Handle Error Here
      //process.stdout.write(`E`);
      //log.info(`E`);
      //console.error('err');
      //return(err);
      error = err;
      await sleep(100);
    }
  }
  if (page){
    process.stdout.write(`N`);
    return (page);
  } else {
    process.stdout.write(`E`);
    return (error);
  }
};


async function getCached(_pLink){
  //_plink = "foo"
  let cached = await cache.get(_pLink);
  if (cached){
    //log.info(`loaded from cache ${_pLink}`);
    return (cached);
  } else {
    //('${_pLink} not found in cache')
    return (false);
  }
  
}

async function saveCached(_pLink, _page){
  //_plink = "foo"
  await cache.set(_pLink, _page)
  //.then(result => log.info(`saved to cache ${_pLink}`/* Success */))
}
/*
async function getCached(_pLink){
  let fileName = _pLink.replace(/[/\\?%*:|"<>]/g, '-');
  let filePath = `${cacheFolder}/${fileName}`;
  try {
    log.info(`Loaded from cache - ${filePath}`);
    return await fs.readFileSync(filePath);
  } catch (e){
    log.info(`${filePath} not cached yet`)
  }
}

async function saveCached(_pLink, _page){
  let fileName = _pLink.replace(/[/\\?%*:|"<>]/g, '-');
  let filePath = `${cacheFolder}/${fileName}`;
  await fs.writeFileSync(filePath, _page);
  log.info(`${filePath} saved`)
}
*/

async function getChannels(){
	let cLink = "http://felixtv.wz.cz/epg/channels.php"
	let channelsAll = false;
	let channelsSelected = [];
  //get all channels
	try {
        const resp = await axios.get(cLink);
        //console.log(resp.data);
        channelsAll = resp.data.channels;
        //return (resp.data)
    } catch (err) {
        // Handle Error Here
        console.error('err');
        return(err)
    }
    if (channelsAll == false){
    	console.log("channels not loaded...");
    	return;
    }
    //filter selected channels
    for (let i in channelsAll){
    	let channel = channelsAll[i];
      //log.info(`Finding ${channel.id}`);
    	if (channelIds.indexOf(channel.id) != -1){
        //log.info(`adding channel ${channel.id}`);
        channelsSelected.push({
          "id": channel.id,
          "name": channel.name,
          "icon": channel.logoUrl
        });
      }
    }
	//log.info(`Selected channels: `, channelsSelected);
  return(channelsSelected);
}

async function getProgrammes(_channelId, _date){
  //http://felixtv.wz.cz/epg/stv.php?ch=nova&d=2022-12-21
  //we get all programmes for channel for specific date from felix...
  let channelPLink = `http://felixtv.wz.cz/epg/stv.php?ch=${_channelId}&d=${_date}` 
  //log.info(`trying to fetch ${channelPLink}`)
  let programmes;
  for (let i = 0; i < 5; i++){
    programmes = await getRequest(channelPLink, true);
    if (programmes){
      break;
    } else {
      await sleep(1000)
    }
  }
  //log.info("programmes", programmes)
  return programmes?.channels[_channelId];
}

async function formatXml(xml, tab) { // tab = optional indent value, default is tab (\t)
    var formatted = '', indent= '';
    tab = tab || '\t';
    xml.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length); // decrease indent by one 'tab'
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;              // increase indent
    });
    return formatted.substring(1, formatted.length-3);
}

async function getTZString(_timeshift){
  let ts = _timeshift/1
  let tsString = " +" + String(ts).padStart(2,`0`)+ "00";
  //function addLeadingZeros(num, totalLength) {
  if (ts < 0) {
    const withoutMinus = String(ts).slice(1);
    tsString = ' -' + withoutMinus.padStart(2, '0') + "00";
  } 
  return (tsString);
}

async function cleanCache(){
  //create cache dir if it doesnt exist
  //var fs = require('fs');
//var dir = './tmp';

  if (!fs.existsSync(cacheFolder)){
      fs.mkdirSync(cacheFolder);
  }
  let daysToClean = days + daysBack;
    let seconds = daysToClean * 60 * 60 * 24; //we convert cache days to seconds...
    //seconds = seconds/24;//!!!!just for test purposes
    const currentTime = Math.floor(new Date().getTime() / 1000);
    const files = Array.from(await fs.promises.readdir(cacheFolder));
    let removedFiles = 0;
    for (const file of files) {
        const filePath = path.join(cacheFolder, file);
        const stats = await fs.promises.stat(filePath);
        const birthTime = Math.floor(stats.birthtimeMs / 1000);
        if (currentTime - birthTime > seconds) {
          //log.info(`cache clean test - ${filePath}`)
          removedFiles++;
          fs.promises.rm(filePath);
        }
    }
  log.info(`Cleaned ${removedFiles} cached files older than ${daysToClean} day(s).`)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function mapGenres(_genresCZ){
  //log.debug("genres cz: ", _genresCZ)
  let genresMapFile = await JSON.parse(fs.readFileSync('./genres.json'));
  let genresMap = genresMapFile.genres;
  //log.debug("Genres Map: ", genresMap);
  let genresKodi = [];
  for (let i in _genresCZ){
    //log.debug(_genresCZ[i]);
    let genreCZKey = _genresCZ[i].trim();
    let genreCZ = genresMap[`${genreCZKey}`];
    //log.debug(`XXX ${genreCZ}`);
    if (genreCZ && !genresKodi.includes(genreCZ)){
      //we have a genre & it is ot already added to map, so we add it to genresKodi array
      //log.debug(`mapping ${_genresCZ[i]} to ${genreCZ}`);
      genresKodi.push(genreCZ);
    } else {
      //genre ot found in map file
      //log.debug("unknown genre: " + _genresCZ[i]);
      if (!genresMapFile.unknown.includes(genreCZKey)){
        //genre not found in mapfile.unknown, lets add it there and save the file...
        //log.debug("new genre, we add it to array");
        genresMapFile.unknown.push(genreCZKey);
        await fs.writeFileSync('./genres.json', JSON.stringify(genresMapFile));
      }
    }
    break;//commemt this if we want to add more than first kodi genre (almost all movies have the same collor)
  }
  //log.debug("genres kodi: ", genresKodi)
  return (genresKodi);
}

async function grabCSTV(_soup, _programme){
  let genresMapFile = await JSON.parse(fs.readFileSync('./genres.json'));
  let time = _programme.startTime.split(" ")[1]; //we parse the hh:mm
  let title = _programme.title;
  var programmes = _soup.findAll("porad");
  //console.log(programmes);
  let CSTVInfo;
  for (let i in programmes){
    let programme = new JSSoup(programmes[i])
    
    let pObject = {
      title: programme.find("nazev").contents[0]._text,
      genre: programme.find("zanr").contents[0]?._text || null,
      date: programme.find("datum").contents[0]._text,
      time: programme.find("cas").contents[0]._text,
      rating: programme.find("labeling").contents[0]?._text || null,
      poster: programme.find("nahled").contents[0]?._text || null,
      description: programme.find("noticka").contents[0]?._text || null
    };
    //remove genres if not genres
    if (genresMapFile.blacklisted.includes(pObject?.genre)){
      pObject.genre = null;
    }
    if (pObject.title.toLowerCase() == title.toLowerCase() && pObject.time == time){
      CSTVInfo = pObject;
    }
  }
  //log.info(CSTVInfo)
  return(CSTVInfo);
}

/* @return A timezone offset in hours repsecting DST */
function getOffset(date, timeZone){
  //let date = new Date();
  //timezone is js specific, so for my use it is Europe/Prague
  //call this function with timezone name
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return (tzDate.getTime() - utcDate.getTime()) / (6e4 * 60);//remove *60 to get minutes instead
}




