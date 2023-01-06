var JSSoup = require('jssoup').default;
const cheerio = require('cheerio');
const axios = require('axios');
const parse5 = require('parse5');
//var soup = new JSSoup('<tag id="hi" class="banner">hello</tag>');
let link = "https://sledovanitv.cz/epg/event/prima_krimi%3A20221222748ef6a9cfc135f7e85dcb7648a9c746"
//var xpath = require("xpath");
const xpath = require("xpath-html");
const {csfd} = require("node-csfd-api");
//const osmosis = require("osmosis");


main()

async function main(){
	//sms();
	grabCsfd();
	//grabCSTV();
	return;
	}

async function test(){
	//var response = await axios.get(link);
	//!!!sms.cz
	var headers = {"user-agent": "SMSTVP/1.7.3 (242;cs_CZ) ID/ef284441-c1cd-4f9e-8e30-f5d8b1ac170c HW/Redmi Note 7 Android/10 (QKQ1.190910.002)"}
	var date = "2022-12-23"
	var chl = "73"
    let html = await axios.get("http://programandroid.365dni.cz/android/v6-program.php?datum=" + date + "&id_tv=" + chl, {headers: headers})
   
	//html = await axios.post("https://services.mujtvprogram.cz/tvprogram2services/services/tvprogrammelist_mobile.php", data = {"channel_cid": 80, "day": "20221223"})
    console.log(html)
    return;
}
	



async function getStvGenres (){




	var response = await axios.get(link);




//parse genres from stv...
	var soup = new JSSoup(response.data);
	let divs = await soup.findAll("div");
	//console.log("XXX", a);
	for (let i in divs){
	      //console.log(a[i].attrs)
	      let div = divs[i];
	      //console.log("WWW", div.text);
	      //if (div == "O pořadu"){
	      if (div.text.startsWith("Tvůrci")){
	      	console.log("XXX", div.text);
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
	      	console.log("YYYxxx", objecsArrayClear);
	      	//we need to get genres only
	      	let genresArray = [];
	      	for (let j in objecsArrayClear){
	      		if (objecsArrayClear[j] == "/"){
	      			//we add a genre that is in previous element
	      			genresArray.push(objecsArrayClear[j-1]);
	      		}
	      		if (objecsArrayClear.length-1 == j){
	      			//we add the last element as well...
	      			genresArray.push(objecsArrayClear[j]);
	      		}
	      	}
	      	console.log("FFF", genresArray);
	      }
	      //console.log("XXX", atrs);
	      //if (atrs.href.includes(`https://www.csfd.cz`)){
	      //  csfdProgUrl = atrs.href;
	      //}
	    }
	//console.log("XXXX", a);
	//var tag = soup.nextElement;
	//console.log(soup.data);
	//tag.attrs
	// {id: 'hi', class: 'banner'} 
	//tag.attrs.id = 'test';
	//console.log(tag.attrs)
	//console.log(tag.name)
	// <tag id="test" class="banner">hello</tag>
	//*/
}

async function grabCsfd(_title, _year){
	//let name = "kašpárek";
	//let year = 1980
	//let res = await csfd.search('Dobré ráno');
	//let res = await csfd.search('Červený trpaslík XI (4)');
	let res = await csfd.movie(`77193`)
	//let res = await csfd.movie(`456346`)
	let movies = res;
	console.log(movies)
	let csfdId;
	for (let i in movies){
		console.log(`${movies[i].title}, ${movies[i].year}`);
		if (movies[i].title.toLowerCase() == _title.toLowerCase() && movies[i].year == _year){
			csfdId = movies[i].id;
		}
	}
	console.log(csfdId)
	return (csfdId);
}

async function sms(){
	let date = "2023-01-04"
	//let channel = "3"
	//let channel = "2"
	//let headers = {"user-agent": "SMSTVP/1.7.3 (242;cs_CZ) ID/ef284441-c1cd-4f9e-8e30-f5d8b1ac170c HW/Redmi Note 7 Android/10 (QKQ1.190910.002)"}
	//let test = await axios.get("http://programandroid.365dni.cz/android/v6-program.php?datum=" + date + "&id_tv=" + channel, {headers: headers})
	let response = await axios.get("https://m.tv.sms.cz/?cas=0&den=2023-01-04&stanice=%C8T2");
	//console.log(response)
	var soup = new JSSoup(response.data)
	let divs = soup.find('div', 'porady')
	//console.log(divs);
	//console.log("Y1", soup.find("https://m.tv.sms.cz/"))
	for (let i in divs.contents){

		console.log("X1", divs.contents[i].contents[1].attrs.href);
		//console.log("X2", divs.contents[i].contents[1].nextElement.contents[0]._text);
		//console.log("X3", divs.contents[i].contents.find("https://m.tv.sms.cz/televize/"))
		//console.log("XX", divs.contents[i].contents[1].previousElement.previousElement._text)
		//console.log("XXX", divs.contents[i].contents[0].contents)
	}
	//let divs = soup.find("div");
	//let porady = divs.find("porady");
	//console.log(test)
	let progPage = "https://m.tv.sms.cz/televize/CT2/20230104/1720127337-Krasy-evropskeho-pobrezi";
	let response2 = await axios.get(progPage);
	let soup2 = new JSSoup(response2.data)
	console.log(soup2.find("body").contents)
	let bodies = soup2.find("body").contents;
	for (let i in bodies){
		//console.log(i, bodies[i].contents);
		let body = bodies[i].contents;
		for (let j in body){
			console.log(`${i}/${j} - `, JSON.stringify(body[j].contents))
		}
	}
	return;
	var soup = new JSSoup(response.data);
	let p = await soup.findAll("p");
	for (let i in p){
		let programme = p[i];
		n = programme.find("n").text
		console.log(n);
		break;
		if ( programme.nextElement.text != "Balthazar (1/6)"){
			continue;
		}
		console.log(programme)
		console.log("\n\nX1", programme.attrs)
		console.log("X2", programme.nextElement.text)
		console.log("X3", programme.parent.parent.name)
		console.log("X4", programme.parent.contents)
		//if (i == 2){
		//	break;
		//}
	}
	//console.log(p);
	//next_day = now + timedelta(days = i)
    //            date = next_day.strftime("%Y-%m-%d")
    //            date_ = next_day.strftime("%d.%m.%Y")
    //            headers = {"user-agent": "SMSTVP/1.7.3 (242;cs_CZ) ID/ef284441-c1cd-4f9e-8e30-f5d8b1ac170c HW/Redmi Note 7 Android/10 (QKQ1.190910.002)"}
               // print(date_)
               // html = requests.get("http://programandroid.365dni.cz/android/v6-program.php?datum=" + date + "&id_tv=" + chl, headers = headers).text
                
}

async function grabCSTV(){
	/*
	<programme channel="ct24" start="20230103100000 +0100" stop="20230103120000 +0100">
		<title>Studio ČT24</title>
		<desc>Témata: Brífink k hodnocení českého předsednictví EU (přímý přenos); Drahé Česko - Hospodaření s penězi; Vývoj války na Ukrajině (komentář); Situace v regionech (vstupy z regionálních studií ČT); Výzvy švédského předsednictví EU (analýza); Tisíce lidí ve Vatikánu se loučí s Benediktem XVI.; Nová varianta koronaviru; Drahé Česko - Dětské skupiny</desc>
		<rating/>
	</programme>
	*/
	let start = "20230103100000 +0100"
	let time = `${start[8]}${start[9]}:${start[10]}${start[11]}`
	let date = `04.01.2023`
	let channel = `ct24`
	let title = "Studio ČT24"
	let channelXmlLink = `https://www.ceskatelevize.cz/services-old/programme/xml/schedule.php?user=test&date=${date}&channel=${channel}`
	let response = await axios.get(channelXmlLink);
	var soup = new JSSoup(response.data);
	//console.log(soup);
	var programmes = soup.findAll("porad");
	//console.log(programmes);
	for (let i in programmes){
		let programme = new JSSoup(programmes[i])
		let programmeObject = {
			title: programme.find("nazev").contents[0]._text,
			genre: programme.find("zanr").contents[0]?._text || null,
			date: programme.find("datum").contents[0]._text,
			time: programme.find("cas").contents[0]._text,
			rating: programme.find("labeling").contents[0]?._text || null,
			poster: programme.find("nahled").contents[0]?._text || null,
			description: programme.find("noticka").contents[0]?._text || null
		}
		console.log(`${programmeObject.time} vs ${time}`)
		if (programmeObject.title.toLowerCase() == title.toLowerCase() && programmeObject.time == time){
			console.log("Match", programmeObject);
			console.log("\n")
		}

		//console.log(programme.find("nazev").contents[0]._text);
		//console.log(programme.find("zanr").contents[0]?._text) || null;
		//console.log(programme.find("datum").contents[0]._text);
		//console.log(programme.find("cas").contents[0]._text);
		//console.log(programme.find("labeling").contents[0]?._text || null);
		//console.log(programme.find("nahled").contents[0]?._text || null);

		//http://img.ceskatelevize.cz/program/porady/1097181328/foto/uni.jpg

		//if (i==0){
		//	break;
		//}

		//return;
		
	}
	
	//console.log(response.data);
	//let channelXmlParsed = parse5.parse(response.data);
	//console.log("\n\n", channelXmlParsed);
	//let programmes = channelXmlParsed.childNodes[1].childNodes[1].childNodes[0].childNodes[1];
	//console.log(programmes);
	//console.log("\n\nX2", channelXmlParsed.childNodes[1].childNodes[1].childNodes[0].childNodes);
	//let programmesParsed = []
	//for (let i in programmes){
	//	let programme = programmes[i];
	//	console.log(programme.childNodes.childNodes);
		//programmesParsed.push{
		//	title: 
		//}

	//}
}


