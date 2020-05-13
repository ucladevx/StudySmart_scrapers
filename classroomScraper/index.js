var AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
//var docClient = new AWS.DynamoDB.DocumentClient();

//RDS
// var pg = require('pg');
// var con = mysql.createConnection({
//   host: 'studysmart-db.chpjzhfmtelr.us-west-1.rds.amazonaws.com',
//   user: 'studyroot',
//   password: 'studysmart-db',
//   port: 5432,
//   database: 'mydb'
// });

// con.connect(function(err) {
//   if (err) throw err;
//   console.log("Connected!");
// });

var pg = require('pg');
var conString = "postgres://studyroot:studysmart-db@studysmart-db.chpjzhfmtelr.us-west-1.rds.amazonaws.com:5432/mydb";

var client = new pg.Client(conString);
client.connect(err => {
  if (err) {
    console.error('Postgres connection error', err.stack);
  } else {
    console.log('connected to Postgres database');
  }
});

const requestPromise = require("request-promise");
const moment = require("moment");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var res = [];
var queryFinished = false;

exports.handler = async function (event) {
  "use strict";

  // Constants
  const mainURL =
    "https://www.registrar.ucla.edu/desktopmodules/ClassRoomSearch/api/webapi/GetClassroomItems";
  const classroomURL =
    "https://www.registrar.ucla.edu/desktopmodules/ClassRoomSearch/api/webapi/GetCalendarEvents";
  const academicCalendarURL = 
    "https://www.registrar.ucla.edu/Calendars/Annual-Academic-Calendar";

  // set the current term based on today's date
  function parseDate(date, year)
  {
      let ret = year.concat("-");
      if(typeof(date) === 'string')
      {
          let tokens = date.split(", ");
          if(tokens.length != 2)
          {
              console.log("could not parse date, datestring was not in correct format");
              process.exit(1);
          }
          else
          {
              let tokens2 = tokens[1].split(" ");
              if(tokens2.length != 2)
              {
                  console.log("could not parse date, datestring was not in correct format");
                  process.exit(1);
              }
              else
              {
                  switch(tokens2[0])
                  {
                      case "January":
                          ret += "01-";
                          break;
                      case "February":
                          ret += "02-";
                          break;
                      case "March":
                          ret += "03-";
                          break;
                      case "April":
                          ret += "04-";
                          break;
                      case "May":
                          ret += "05-";
                          break;
                      case "June":
                          ret += "06-";
                          break;
                      case "July":
                          ret += "07-";
                          break;
                      case "August":
                          ret += "08-";
                          break;
                      case "September":
                          ret += "09-";
                          break;
                      case "October":
                          ret += "10-";
                          break;
                      case "Novemeber":
                          ret += "11-";
                          break;
                      case "December":
                          ret += "12-";
                          break;
                      default:
                          console.log("could not parse date, month is invalid");
                          process.exit(1);
                  }

                  if(tokens2[1].length == 1)
                      ret += "0";
                  ret = ret.concat(tokens2[1]);
                  return ret;
              }
          }
      }
      else
      {
          console.log("could not parse date, parameter was not a string");
          process.exit(1);
      }
  }

  async function getCurrentTerm()
  {
    console.log("getting current term");
    console.log("trying to send request to", academicCalendarURL);
    async function handleRequest(options, delay)
    {
        let a = new Promise(function(resolve, reject) {
        setTimeout(() => resolve("done"), delay);
        });

        await a;

        return requestPromise(options);
    }

    let options = {
        method: "GET",
        url: academicCalendarURL,
        json: true
    };
    
    var results = await handleRequest(options, 1000);
    const dom = new JSDOM(results);

    let currDate = new Date();
    let year = currDate.getFullYear() - 2000;
    // we get all the elements where id ends with (for example) 2019-20 and 2020-21
    let academicYears = dom.window.document.querySelectorAll(`[id$='20${year - 1}-${year}'][id^='lt'], [id$='20${year}-${year + 1}'][id^='lt']`);
    
    // then we loop through the two academic years and we find the dates that "quarter begins" corresponds to
    // first maintain a counter to determine what year each date corresponds to
    // each time, it only outputs 8 values, because we are searching through two academic years 
    // 2 academic years * (3 dates for each regular quarter + 1 date for summer session) = 8 dates
    let count = 0;
    let dates = [];
    for(let i = 0; i < academicYears.length; i++)
    {
        let rows = academicYears[i].querySelectorAll("td");
        for(let j = 0; j < rows.length; j++)
        {
            let text = rows[j].textContent;
            if(text.match(/Quarter begins*/) || text.match(/Summer session begins*/))
            {
                switch(count)
                {
                    case 0:
                        // we'll discard the date from the previous year
                        break;
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        // we only push the dates that pertain to the current year
                        dates.push(new Date(parseDate(rows[j + 1].textContent, "20" + year)));
                        break;
                    case 5:
                    case 6:
                    case 7:
                        // we'll also discared the dates in the next year
                        break;
                    default:
                        // this is just to check if we've outputted the right number of dates. 
                        // if there were too many, then we know there was an error 
                        console.log("error: too many \"quarter begins\" or \"summer session begins\" dates were outputted");
                }

                count++;
            }
        }
    }

    // our dates list should contain 4 dates in the same calendar year - the start of each quarter: Winter, Spring, Summer Sessions, Fall
    let num = -1;
    for(let i = 0; i < dates.length; i++)
    {
        if(currDate.getTime() < dates[i].getTime())
        {
            num = i;
            break;
        }
    }

    if(num == -1)
        num = 4;

    switch(num)
    {
        case 0:
            return (year - 1) + "F";
        case 1:
            return year + "W";
        case 2:
            return year + "S";
        case 3:
            return year + "1";
        case 4:
            return year + "F";
    }
  }

  let currentTerm = await getCurrentTerm();
  console.log("the current term is", currentTerm);

  // Helper functions
  function processClassroomJson(buildingClassroom) {
    return {
      building: buildingClassroom.value.slice(0, 8),
      room: buildingClassroom.value.substr(9),
      buildingName: buildingClassroom.label.slice(0, 8).trim(),
      roomName: buildingClassroom.label.substr(9).trim()
    };
  }

  function processClassTimeObject(buildingArray, classNameTime) {
    if (classNameTime.enroll_total === 0) return buildingArray;

    let processedObject = {
      day: "",
      start: "",
      end: ""
    };

    if (classNameTime.start.substr(0, 9) != "2014-11-1") {
      processedObject.day = "Varies";
      processedObject.start = classNameTime.start.substr(0, 5);
      processedObject.end = classNameTime.end.substr(0, 5);
    } else {
      let startTime = moment(classNameTime.start);
      let endTime = moment(classNameTime.end);

      processedObject.day = startTime.format("d");
      processedObject.start = startTime.format("HH:mm");
      processedObject.end = endTime.format("HH:mm");
    }
    buildingArray.push(processedObject);
    return buildingArray;
  }

  async function getClassroomTimes(buildingRoomObject, callback) {
    let options = {
      method: "GET",
      url: classroomURL,
      qs: {
        term: currentTerm,
        building: buildingRoomObject.building,
        room: buildingRoomObject.room
      },
      json: true
    };

    var finishedRequest = false;
    while(!finishedRequest)
    {
      try
      {
        var body = await handleRequest(options, 100);
        finishedRequest = true;
      }
      catch(e)
      {
        console.log("RequestError for getting ", buildingRoomObject.building, buildingRoomObject.room);
        console.log(e.message);
        console.log("trying again...")
      }
    }

    body = body.reduce(processClassTimeObject, []);

    let finalClassroomObject = {
      building: buildingRoomObject.buildingName,
      room: buildingRoomObject.roomName,
      classTimes: body
    };
    let ClassroomAvailabilities = getAvailableTimes(finalClassroomObject);
    callback(ClassroomAvailabilities);
  }

  function tomins(timeString) {
    let timeObj = stoiParser(timeString);
    return timeObj['hour'] * 60 + timeObj['minutes'];
  }

  function stoiParser(timeString) {
    return {
      'hour': parseInt(timeString.substring(0, 2)),
      'minutes': parseInt(timeString.substring(3))
    };
  }

  function getAvailableTimes(classroomTimeObject) {
    let inverseObject = {};
    let inverseArray = [];

    inverseObject.building = classroomTimeObject.building;
    inverseObject.room = classroomTimeObject.room;
    inverseObject.classTimes = [];
    inverseObject.class_key = "";
    let timesByDay = { '1': [], '2': [], '3': [], '4': [], '5': [], 'Varies': [] };
    let inverseTimesByDay = { '1': [], '2': [], '3': [], '4': [], '5': [], 'Varies': [] }
    for (let timeSlot of classroomTimeObject.classTimes) {
      timesByDay[timeSlot.day].push(timeSlot);
    }
    for (let d in timesByDay) {
      let s = '08:00';
      for (let slot of timesByDay[d]) {
        if (tomins(slot['start']) - tomins(s) > 15) {
          inverseTimesByDay[d].push({ 'day': d, 'start': s, 'end': slot['start'] });
        }
        s = slot['end'];
      }
      inverseTimesByDay[d].push({ 'day': d, 'start': s, 'end': '22:00' });
    }

    for (let d in inverseTimesByDay) {
      for (let slot of inverseTimesByDay[d]) {
        let NewTimeSlot = {}
        NewTimeSlot.day = d;
        NewTimeSlot.start = tomins(slot['start']);
        NewTimeSlot.end = tomins(slot['end']);
        NewTimeSlot.room = inverseObject.room;
        NewTimeSlot.building = inverseObject.building;
        inverseArray.push(NewTimeSlot);
      }
    }

    return inverseArray;
  }

  // Wrapper function for sending requests, with delay parameter.
  async function handleRequest(options, delay)
  {
    let a = new Promise(function(resolve, reject) {
      setTimeout(() => resolve("done"), delay);
    });

    await a;

    return requestPromise(options);
  }

  async function queryWrapper(sql)
  {
    await client.query(sql);
    return true;
  }

  async function continueExec() 
  {
    // Here is the trick, wait until var callbackCount is set number of callback functions.
    if (done_count > 0) 
    {
      return false;
    }

    // Finally, do what you need
    console.log("got each classroom's schedule");
    let st = ""
    res.forEach(function (resp) {
      if (resp.day != "Varies" && resp.start < resp.end) {

        let day = resp.day.toString();
        let start = resp.start.toString();
        let end = resp.end.toString();
        let room = resp.room;
        let building = resp.building;
        st += "(" + day + "," + start + "," + end + "," + "'" + room + "'" + "," + "'" + building + "'" + "),\n";

      }
    })

    // Run the query in the database.
    let deleteSQL = "DELETE FROM classroom_availabilities;";
    let insertSQL = "INSERT INTO classroom_availabilities (day, start_time, end_time, room, building) VALUES" + st.substring(0, st.length - 2);
    try
    {
      console.log("deleting existing data from database...");
      await queryWrapper(deleteSQL);
      let delay = new Promise(function(resolve, reject) {
        setTimeout(() => resolve("done"), 1000);
      });
      await delay;
      console.log("inserting into the database...");
      queryFinished = await queryWrapper(insertSQL);
    }
    catch(err)
    {
      console.log(err.stack);
      queryFinished = true;
    }

    return true;
  }

  function isUnusedRoom(crAvailList)
  {
    if(crAvailList.length == 6 
      && crAvailList[0].day == '1' 
      && crAvailList[1].day == '2'
      && crAvailList[2].day == '3'
      && crAvailList[3].day == '4'
      && crAvailList[4].day == '5'
      && crAvailList[5].day == 'Varies')
      return true;
    
    return false;
  }

  // try to get classrooms for the current quarter
  let options = {
    method: "GET",
    url: mainURL,
    json: true
  };

  // Send a request to get all classrooms for the current quarter.
  var resolved = false;
  var delay = 2000;
  while(!resolved)
  {
    console.log("trying to send request to ", options.url);
    try
    {
      var body = await handleRequest(options, delay);
      resolved = true;
    }
    catch(e)
    {
      console.log("error sending request to ", options.url, ": ", e.message);
      console.log("trying to send it again...");
    }
  }
  
  console.log("got classrooms");

  // For each classroom, send a request to get its availability.
  console.log("trying to send request to server for each classroom's availability...");
  let classrooms = body.map(processClassroomJson);
  let done_count = classrooms.length;

  classrooms.forEach(async function (classroom) {
    await getClassroomTimes(classroom, function (response) {
      // Here you have access to your variable
      if(!isUnusedRoom(response))
        res = res.concat(response)
      done_count -= 1;
    })
  });

  // We must wait until all the requests for the classrooms have returned.
  // The while loop will continue to call "continueExec()" until the variable
  // done_count reaches 0. The "continueExec()" function includes the query
  // that is run in the database.
  while(1)
  {
    let a = new Promise(function(resolve, reject) {
      setTimeout(() => resolve("done"), 2000);
    });

    await a;

    console.log("waiting for all classroom requests to return...");
    if(await continueExec())
      break;
  }

  // Wait for the query to finish running and then break.
  while(1)
  {
    if(queryFinished)
    {
      console.log("finished.");
      break;
    }

    let a = new Promise(function(resolve, reject) {
      setTimeout(() => resolve("done"), 2000);
    });

    await a;
    console.log("waiting for query to finish...");
  }
};

//uncomment out this part if you want to run it locally 
/*try {
  exports.handler({});
} catch (e) {
  console.log("error");
  // Deal with the fact the chain failed
}*/
