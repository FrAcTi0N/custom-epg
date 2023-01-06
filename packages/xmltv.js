'use strict'

const xmlJs = require('xml-js')
const fs = require('fs')
const {DateTime} = require('luxon')
//const debug = require('debug')('xmltv-skynz:xmltv')

/**
 * Minimal XmlTv implementation, just that needed for sky data is implemented
 */
class XmlTv {

    /**
     * 
     * @param {Object} tvAttributes 
     * @param {string} tvAttributes.sourceInfoUrl URL describing the data source in some human-readable form
     * @param {string} tvAttributes.sourceInfoName link text for that URL
     * @param {string} tvAttributes.sourceDataUrl where the actual data is grabbed from
     * @param {string} tvAttributes.generatorInfoName in the form 'progname/version'
     * @param {string} tvAttributes.generatorInfoUrl link to more info about the program
     */
    constructor(tvAttributes) {
        let d = this.data = {
            _declaration: {
                _attributes: {
                    version: '1.0',
                    encoding: 'utf-8'
                }
            },
            _doctype: 'tv SYSTEM "xmltv.dtd"',
            tv: {
                _attributes: {
                    date: this._formatDate(DateTime.utc())
                },
                channel: [],
                programme: []
            }
        }
        let setAttr = (a, v) => { if (v) d.tv._attributes[a] = v }
        let a = tvAttributes
        setAttr('source-info-url', a.sourceInfoUrl)
        setAttr('source-info-name', a.sourceInfoName)
        setAttr('source-data-url', a.sourceDataUrl)
        setAttr('generator-info-name', a.generatorInfoName)
        setAttr('generator-info-url', a.generatorInfoUrl)
        // Set to allow quick check for duplicates
        this.programmeIds = new Set()
    }

    /**
     * 
     * @param {DateTime} dt 
     */
    _formatDate(dt) {
        return dt.toFormat('yyyyMMddHHmmss ZZZ')
    }

    _removeUndefineds(obj) {
        let self = this
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object') self._removeUndefineds(obj[key]);
            else if (obj[key] === undefined) delete obj[key];
        });
        return obj;        
    }

    /**
     * 
     * @param {Object} channel 
     * @param {string} channel.id unique DNS-like name
     * @param {Array} channel.displayNames user-friendly names for the channel - maybe even a channel number
     * @param {string} channel.urls If multiple url elements are given, the most authoritative or official (which might conflict...) sites should be listed first 
     * @param {string} channel.icon
     */
    addChannel(channel) {
        let c = channel
        let xmlC = {
            _attributes: { id: c.id },                      
            'display-name': (c.displayNames || []).map(x => ({ _text: x })),
            url: (c.urls || []).map(x => ({ _text: x }))
        }
        if (c.icon) xmlC.icon = {
            _attributes: {
                src: c.icon
            }
        }
        this._removeUndefineds(xmlC)

        this.data.tv.channel.push(xmlC)
    }

    addChannels(channels) {
        channels.forEach(c => this.addChannel(c))
    }

    addProgramme(programme) {
        let p = programme
        let id = '' + p.channel + p.start + p.stop
        if (!this.programmeIds.has(id)) {
            let xmlP = {
                _attributes: {
                    channel: programme.channel,
                    //start: this._formatDate(programme.start),
                    //stop: this._formatDate(programme.stop),
                    start: programme.start,
                    stop: programme.stop,
                },
                title: p.title,
                desc: p.desc,
                date: p.date,
                category: p.categories,
                rating: p.rating,
                'episode-num': p.episodeNum && {
                    _attributes: { system: p.episodeNum.system },
                    _text: p.episodeNum.value
                },
                //image: p.poster && {
                //    _attributes: {type: "poster"},
                //    _text: p.poster.value
                //},
                icon:  {
                    _attributes: {
                        src: p.poster?.value
                    }
                },
            }
    
            this._removeUndefineds(xmlP)
            this.data.tv.programme.push(xmlP)
            this.programmeIds.add(id)
            //console.log(xmlP)
        }
    }

    addProgrammes(programmes) {
        programmes.forEach(p => this.addProgramme(p))
    }

    toXml() {
        return xmlJs.js2xml(this.data, { compact: true })
    }

}

module.exports = XmlTv
