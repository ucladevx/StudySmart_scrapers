var lib_info_scraper = require("./libraryinfo-scraper");
var reslife_scraper = require("./reslife-scraper");

var min_to_ms = 60000;
var reslife_scraper_interval = 5 * min_to_ms;
var lib_info_scraper_interval = 10080 * min_to_ms
// console.log("I am doing my 5 minutes check");

setInterval(function () {
 console.log("I am doing my 1 week check");
 lib_info_scraper.scrape();
  //do your stuff here
}, lib_info_scraper_interval); 

setInterval(function () {
  console.log("I am doing my 5 minutes check");
  reslife_scraper.scrape();
  // do your stuff here
}, reslife_scraper_interval);

//setInterval(function () {
//   console.log("I am doing my 10 minutes check");
//   // do your stuff here
// }, the_interval * 2);