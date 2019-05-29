"use strict";
var AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
var docClient = new AWS.DynamoDB.DocumentClient();

const request = require("request");
const moment = require("moment");

const currentTerm = "19S";
const mainURL =
  "https://www.registrar.ucla.edu/desktopmodules/ClassRoomSearch/api/webapi/GetClassroomItems";
const classroomURL =
  "https://www.registrar.ucla.edu/desktopmodules/ClassRoomSearch/api/webapi/GetCalendarEvents";

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

// let classroomTimes = [];

function getClassroomTimes(buildingRoomObject) {
  let options = {
    method: "GET",
    url: classroomURL,
    qs: {
      term: currentTerm,
      building: buildingRoomObject.building,
      room: buildingRoomObject.room
    },
    json: true,
    callback: function(error, response, body) {
      if (error) throw new Error(error);

      body = body.reduce(processClassTimeObject, []);

      let finalClassroomObject = {
        building: buildingRoomObject.buildingName,
        room: buildingRoomObject.roomName,
        classTimes: body
      };
      //console.log(finalClassroomObject);
    //  console.log(getAvailableTimes(finalClassroomObject));
    finalClassroomObject = getAvailableTimes(finalClassroomObject)
        let params = {
          TableName: "class_scrape_table",
          Item: finalClassroomObject
        };
        console.log(params);
        docClient.put(params, function(err, data) {
          if (err) {
            throw err;
            console.log("error");
          }
          console.log("successfully put item");
          console.log(params);
        });
    //getAvailableTimes(finalClassroomObject);
      //classroomTimes.push(finalClassroomObject);
    }
  };
  request(options);
}

function tomins(timeString)
{
  let timeObj = stoiParser(timeString);
  return timeObj['hour'] * 60 + timeObj['minutes'];
}

function stoiParser(timeString)
{
  return {
  'hour': parseInt(timeString.substring(0, 2) ), 
  'minutes': parseInt(timeString.substring(3) )
  };
}




function getAvailableTimes(classroomTimeObject)
{
  let inverseObject = {};
  inverseObject.building = classroomTimeObject.building;
  inverseObject.room = classroomTimeObject.room;
  inverseObject.classTimes = [];
  inverseObject.class_key = "";
  let timesByDay = {'1': [], '2': [], '3': [], '4': [], '5': [], 'Varies':[]};
  let inverseTimesByDay = {'1': [], '2': [], '3': [], '4': [], '5': [], 'Varies':[]}
  for (let timeSlot of classroomTimeObject.classTimes) {
    timesByDay[timeSlot.day].push(timeSlot);
  }
  for(let d in timesByDay)
  {
    let s = '08:00';
    for(let slot of timesByDay[d])
    { 
      if(tomins(slot['start']) - tomins(s) > 15){
        inverseTimesByDay[d].push({'day': d, 'start': s, 'end': slot['start']});
      }
      s = slot['end'];
    }
    inverseTimesByDay[d].push({'day': d, 'start': s, 'end': '22:00'});
  }
  
  for(let d in inverseTimesByDay)
  {
    for(let slot of inverseTimesByDay[d])
    {
      inverseObject.classTimes.push({'day':d, 'start':tomins(slot['start']), 'end':tomins(slot['end'])});
      inverseObject.class_key = inverseObject.building + inverseObject.room;
    }
  }
  return inverseObject;
}

let options = {
  method: "GET",
  url: mainURL,
  json: true,
  callback: function(error, response, body) {
    if (error) {
      console.log("error getting classrooms", error);
      return;
    }
    console.log("got classrooms");
    let classrooms = body.map(processClassroomJson); 
    classrooms.forEach(getClassroomTimes);    
    //classrooms.forEach(getAvailableTimes);
    
  }
};

request(options);
