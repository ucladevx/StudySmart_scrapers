"use strict";

const moment = require("moment-timezone");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
var AWS = require("aws-sdk");
var Promise = require("bluebird");
var rp = require("request-promise");

AWS.config.update({ region: "us-east-1" });
var docClient = new AWS.DynamoDB.DocumentClient();
/*
JSON Format {
  "Room Details": "Sproul Study Room 110E (max 4 people)",
  "Time": "11:00pm-midnight on Sun, Mar 03",
  "Link": "https://www.orl.ucla.edu/reserve?type=sproulstudy&duration=60&date=2019-03-03&roomid=3584&start=1551682800&stop=1551686400"
}
*/

const meetingRooms = [
  "sproulstudy",
  "hedrick",
  "hedrickstudy",
  "hedrickmusic",
  "movement",
  "music",
  "rieber",
  "sproulmusic",
  "deneve"
];

const durations = ["60", "120"];

var now = moment().tz("America/Los_Angeles");
const formatString = "YYYY-MM-DD";

let next21DaysStrings = [];

exports.handler = async event => {
  let numSaturdays = 0;
  next21DaysStrings = [];
  now = moment().tz("America/Los_Angeles");
  for (var i = 0; numSaturdays < 3; i++) {
    next21DaysStrings[i] = now.format(formatString);

    if (now.day() == 6) numSaturdays++;
    now.add(1, "days");
  }
  for (var dayIndex = 0; dayIndex < 7; dayIndex++) {
    for (
      var meetingRoomIndex = 0;
      meetingRoomIndex < meetingRooms.length;
      meetingRoomIndex++
    ) {
      for (
        var durationIndex = 0;
        durationIndex < durations.length;
        durationIndex++
      ) {
        var notResolved = true;
        var delay = 2000;
        while (notResolved) {
          try {
            var body = await sendRequest(
              meetingRoomIndex,
              durationIndex,
              dayIndex,
              delay
            );
            scrapeData(body, meetingRoomIndex, durationIndex, dayIndex); //TODO make async so last scrape is not dropped
            notResolved = false;
          } catch (e) {
            console.log(e);
            delay *= 2;
          }
        }
      }
    }
  }
};

function finishRequest(toAdd, toDelete) {
  console.log("to add: ");
  console.log(toAdd);
  console.log("to delete: ");
  console.log(toDelete);

  toAdd.forEach(itemValue => {
    let params = {
      TableName: "study_info",
      Item: itemValue
    };

    docClient.put(params, function(err, data) {
      if (err) {
        //throw err;
        console.log("error");
      }
      console.log("successfully put item");
      console.log(params);
    });
  });

  toDelete.forEach(itemValue => {
    let params = {
      TableName: "study_info",
      Key: { link: itemValue.link }
    };

    docClient.delete(params, function(err, data) {
      if (err) {
        //throw err;
        console.log("error");
      }
      console.log("successfully deleted item");
      console.log(params);
    });

    itemValue.deletedTime = moment()
      .tz("America/Los_Angeles")
      .format();

    params = {
      TableName: "deleted_study_info",
      Item: itemValue
    };

    docClient.put(params, function(err, data) {
      if (err) {
        //throw err;
        console.log("error");
      }
      console.log(params);
    });
  });
}

function sortFunction(a, b) {
  if (a.link < b.link) return -1;
  else return 1;
}

function compareDatabaseData(params, scrapedData) {
  docClient.query(params, function(err, queryData) {
    if (err) {
      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      var queryItems = queryData.Items;

      queryItems.sort(sortFunction);
      scrapedData.sort(sortFunction);

      console.log("queryItems");
      console.log(queryItems);

      let databaseIndex = 0;
      let scrapeIndex = 0;
      let databaseLength = queryItems.length;
      let scrapeLength = scrapedData.length;

      let toAdd = [];
      let toBeDeleted = [];

      while (databaseIndex != databaseLength || scrapeIndex != scrapeLength) {
        if (databaseIndex == databaseLength) {
          toAdd.push(scrapedData[scrapeIndex]);
          scrapeIndex++;
        } else if (scrapeIndex == scrapeLength) {
          toBeDeleted.push(queryItems[databaseIndex]);
          databaseIndex++;
        } else if (
          queryItems[databaseIndex].link == scrapedData[scrapeIndex].link
        ) {
          scrapeIndex++;
          databaseIndex++;
        } else if (
          queryItems[databaseIndex].link > scrapedData[scrapeIndex].link
        ) {
          toAdd.push(scrapedData[scrapeIndex]);
          scrapeIndex++;
        } else if (
          queryItems[databaseIndex].link < scrapedData[scrapeIndex].link
        ) {
          toBeDeleted.push(queryItems[databaseIndex]);
          databaseIndex++;
        }
      }

      finishRequest(toAdd, toBeDeleted);
    }
  });
}

async function sendRequest(meetingRoomIndex, durationIndex, dayIndex, delay) {
  let options = {
    method: "GET",
    url: "http://reslife.ucla.edu/reserve",
    qs: {
      type: meetingRooms[meetingRoomIndex],
      duration: durations[durationIndex],
      date: next21DaysStrings[dayIndex],
      partial: ""
    }
    //timeout: 20000,
  };
  console.log(delay);
  let a = new Promise(function(resolve, reject) {
    setTimeout(() => resolve("done"), delay);
  });
  await a;
  console.log("sending request");
  console.log({
    type: meetingRooms[meetingRoomIndex],
    duration: durations[durationIndex],
    date: next21DaysStrings[dayIndex]
  });
  return rp(options);
}

function scrapeData(body, meetingRoomIndex, durationIndex, dayIndex) {
  const dom = new JSDOM(body);

  let data = [];
  let columns = dom.window.document.querySelectorAll(".col-md-6");
  //Get all links so that you can redirect user to registration page directly
  let links = dom.window.document.getElementsByTagName("a");
  let filteredLinks = [];
  //Need to filter all links so that we only save the ones with the class mentioned below
  for (k = 0; k < links.length; k++) {
    if (
      links[k].getAttribute("class") ==
      "btn btn-sm btn-block btn-default btn-select"
    ) {
      filteredLinks.push(links[k]);
    }
  }
  //Counter for filtered links
  var k = 0;
  //Start at 2 because first value is not relevant
  //Increment by 2 because every pair of 2 elements gives us "room details" and "time"

  for (var i = 2; i < columns.length; i += 2) {
    //Create JS object and push required elements
    var obj = new Object();
    obj["Room Details"] = columns[i].textContent.trim();
    obj["Time"] = columns[i + 1].textContent.trim();
    obj["Link"] = filteredLinks[k].getAttribute("href");
    k++;

    var splitLink = obj["Link"]
      .split("?")
      .join("=")
      .split("&")
      .join("=")
      .split("=");
    var infoName, infoDate, infoDuration, infoStart;

    for (var linkI = 0; linkI < splitLink.length; linkI++) {
      if (splitLink[linkI] == "type") {
        infoName = splitLink[linkI + 1];
      } else if (splitLink[linkI] == "date") {
        infoDate = splitLink[linkI + 1];
      } else if (splitLink[linkI] == "duration") {
        infoDuration = splitLink[linkI + 1];
      } else if (splitLink[linkI] == "start") {
        infoStart = splitLink[linkI + 1];
      }
    }

    var entry = {
      link: obj["Link"],
      name: infoName,
      date: infoDate,
      duration: infoDuration,
      start: infoStart,
      details: obj["Room Details"],
      time: obj["Time"]
    };

    data.push(entry);
  }

  var params = {
    TableName: "study_info",
    KeyConditionExpression: "#dt = :dateQuery AND #nm = :nameQuery",
    FilterExpression: "#dur = :durationFilter",
    ExpressionAttributeNames: {
      "#dt": "date",
      "#nm": "name",
      "#dur": "duration"
    },
    ExpressionAttributeValues: {
      ":dateQuery": next21DaysStrings[dayIndex],
      ":nameQuery": meetingRooms[meetingRoomIndex],
      ":durationFilter": durations[durationIndex]
    },
    IndexName: "date-name-index",
    ReturnConsumedCapacity: "TOTAL"
  };
  console.log("successfully scraped");
  console.log({
    type: meetingRooms[meetingRoomIndex],
    duration: durations[durationIndex],
    date: next21DaysStrings[dayIndex]
  });
  console.log(data);

  compareDatabaseData(params, data);
}

//uncomment out this part if you want to run it locally 
/*try {
  exports.handler({});
} catch (e) {
  console.log("error");
  // Deal with the fact the chain failed
}*/