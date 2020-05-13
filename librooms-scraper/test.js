var request = require("request");
const moment = require("moment-timezone");
var AWS = require("aws-sdk");
var Promise = require("bluebird");
var rp = require("request-promise");
AWS.config.update({ region: "us-east-1" });
var docClient = new AWS.DynamoDB.DocumentClient();

(async function main () {

  var now = moment().tz("America/Los_Angeles");
  const formatString = "YYYY-MM-DD";
  var todayString = now.format(formatString);
  now.add(5, "days");
  var fiveDaysLaterString = now.format(formatString);
  var yrlOptions = {
    method: "POST",
    url: "http://calendar.library.ucla.edu/spaces/availability/grid", //TODO: change to https
    headers: {
      "cache-control": "no-cache",
      Referer: "http://calendar.library.ucla.edu/allspaces"
    },
    form: {
      lid: "5567",
      gid: "0",
      eid: "-1",
      start: todayString,
      end: fiveDaysLaterString
    },
    json: true
  };

  var powellOptions = {
    method: "POST",
    url: "http://calendar.library.ucla.edu/spaces/availability/grid", //TODO: change to https
    headers: {
      "cache-control": "no-cache",
      Referer: "http://calendar.library.ucla.edu/allspaces"
    },
    form: {
      lid: "4361",
      gid: "0",
      eid: "-1",
      start: todayString,
      end: fiveDaysLaterString
    },
    json: true
  };

  var powellInformation = await rp(powellOptions);
  var yrlInformation = await rp(yrlOptions);
  var powellData = [];
  var yrlData = [];
  for(var i = 0; i < powellInformation.length; i++)
  {
    if(powellInformation[i]["className"] == "s-lc-eq-checkout")
    {
      continue;
    }
    else
    {
      var duration = 30;
      var obj = new Object();
      var dateTime = powellInformation[i]["start"].split(" ");
      var roomName;
      var roomId = powellInformation[i]["itemId"];
      var randomId = false;
      switch (roomId) {
        case 29694:
          roomName = "Powell Group Study Room A"
          break;
        case 29695:
          roomName = "Powell Group Study Room B"
          break;
        case 29696:
          roomName = "Powell Group Study Room C"
          break;
        case 29697:
          roomName = "Powell Group Study Room D"
          break;
        case 29698:
          roomName = "Powell Group Study Room E"
          break;
        case 29699:
          roomName = "Powell Group Study Room F"
          break;
        default: 
          randomId = true;
      }
      if (randomId) {
        continue;
      }
      obj["Building Name"] = "Powell Library";
      obj["Room"] = roomName;
      obj["Capacity"] = 8;
      obj["Date"] = dateTime[0];
      obj["Start Time"] = dateTime[1];
      if(i+1 != powellInformation.length)
      {
        var dateTimeFuture = powellInformation[i]["start"].split(" ");
        while(powellInformation[i+1]["className"] != "s-lc-eq-checkout" && dateTimeFuture[0] == dateTime[0])
        {
          const newDateTimeFuture =  powellInformation[i+1]["start"].split(" ")
          if (newDateTimeFuture[0] == dateTimeFuture[0]) {
            duration += 30;
            i++;
            dateTimeFuture[0] = newDateTimeFuture[0];
            dateTime[0] = newDateTimeFuture[0];

          } else if (newDateTimeFuture[0] !=  dateTimeFuture[0] && newDateTimeFuture[1] == '00:00:00') {
            duration += 30;
            i++;
            dateTimeFuture[0] = newDateTimeFuture[0];
            dateTime[0] = newDateTimeFuture[0];

          } else {
            break;
          }

          if(i+1 == powellInformation.length)
          break;
        }
      }
      obj["Duration"] = duration.toString();
      var item = {
        combined: obj.Room + "," + obj["Building Name"]+ ","  + obj.Capacity + ","+ obj.Date+ "," + obj.Day+ "," + obj["Start Time"]+ "," + obj.Duration,
        room: obj.Room,
        building: obj["Building Name"],
        capacity: obj.Capacity,
        date: obj.Date, 
        start: obj["Start Time"], 
        duration: obj.Duration
      }
      powellData.push(item);
    }
  }


  var paramsPowell = {
    TableName: "lib_rooms",
    KeyConditionExpression: "#bd = :buildingQuery",
    ExpressionAttributeNames: {
      "#bd": "building",
    },
    ExpressionAttributeValues: {
      ":buildingQuery": "Powell Library",
    },
    IndexName: "building-index",
    ReturnConsumedCapacity: "TOTAL"
  };

//  compareDatabaseData(paramsPowell, powellData);

  for(var i = 0; i < yrlInformation.length; i++)
  {
    if(yrlInformation[i]["className"] == "s-lc-eq-checkout")
    {
      continue;
    }
    else
    {
      var duration = 30;
      var obj = new Object();
      var dateTime = yrlInformation[i]["start"].split(" ");
      var roomName;
      var roomId = yrlInformation[i]["itemId"];
      var capacity = 0; 
      var randomId = false 
      if(roomId >= 29703 && roomId <= 29718)
      {
        capacity = 8
      }
      else if(roomId <= 29738 && roomId >= 29719)
      {
        capacity = 6;
      }
      switch (roomId) {
        case 29703:
          roomName = "YRL Group Study Room G01"
          break;
        case 29704:
          roomName = "YRL Group Study Room G02"
          break;
        case 29705:
          roomName = "YRL Group Study Room G03"
          break;
        case 29706:
          roomName = "YRL Group Study Room G04"
          break;
        case 29707:
          roomName = "YRL Group Study Room G05"
          break;
        case 29708:
          roomName = "YRL Group Study Room G06"
          break;
        case 29709:
          roomName = "YRL Group Study Room G07"
          break;
        case 29710:
          roomName = "YRL Group Study Room G08"
          break;
        case 29712:
          roomName = "YRL Group Study Room G09"
          break;
        case 29713:
          roomName = "YRL Group Study Room G10"
          break;
        case 29714:
          roomName = "YRL Group Study Room G11"
          break;
        case 29715:
          roomName = "YRL Group Study Room G12"
          break;
        case 29716:
          roomName = "YRL Group Study Room G13"
          break;
        case 29717:
          roomName = "YRL Group Study Room G14"
          break;
        case 29718:
          roomName = "YRL Group Study Room G15"
          break;
        case 29719:
          roomName = "YRL Collaboration Pod R01"
          break;
        case 29720:
          roomName = "YRL Collaboration Pod R02"
          break;
        case 29721:
          roomName = "YRL Collaboration Pod R03"
          break;
        case 29722:
          roomName = "YRL Collaboration Pod R04"
          break;
        case 29723:
          roomName = "YRL Collaboration Pod R05"
          break;
        case 29724:
          roomName = "YRL Collaboration Pod R06"
          break;
        case 29725:
          roomName = "YRL Collaboration Pod R07"
          break;
        case 29726:
          roomName = "YRL Collaboration Pod R08"
          break;
        case 29727:
          roomName = "YRL Collaboration Pod R09"
          break;
        case 29728:
          roomName = "YRL Collaboration Pod R10"
          break;
        case 29729:
          roomName = "YRL Collaboration Pod R11"
          break;
        case 29730:
          roomName = "YRL Collaboration Pod R12"
          break;
        case 29731:
          roomName = "YRL Collaboration Pod R13"
          break;
        case 29732:
          roomName = "YRL Collaboration Pod R14"
          break;
        case 29733:
          roomName = "YRL Collaboration Pod R15"
          break;
        case 29734:
          roomName = "YRL Collaboration Pod R16"
          break;
        case 29735:
          roomName = "YRL Collaboration Pod R17"
          break;
        case 29736:
          roomName = "YRL Collaboration Pod R18"
          break;
        case 29737:
          roomName = "YRL Collaboration Pod R19"
          break;
        case 29738:
          roomName = "YRL Collaboration Pod R20"
          break;
        default: 
          randomId = true;
          break;

      }
      if (randomId) {
        continue;
      }
      obj["Building Name"] = "Young Research Library";
      obj["Room"] = roomName;
      obj["Capacity"] = capacity;
      obj["Date"] = dateTime[0];
      obj["Start Time"] = dateTime[1];
      if(i+1 != yrlInformation.length)
      {
        var dateTimeFuture = yrlInformation[i]["start"].split(" ");
        while(yrlInformation[i+1]["className"] != "s-lc-eq-checkout" && dateTimeFuture[0] == dateTime[0])
        {
          const newDateTimeFuture =  yrlInformation[i+1]["start"].split(" ")
          if (newDateTimeFuture[0] == dateTimeFuture[0]) {
            duration += 30;
            i++;
            dateTimeFuture[0] = newDateTimeFuture[0];
            dateTime[0] = newDateTimeFuture[0];
          } else if (newDateTimeFuture[0] !=  dateTimeFuture[0] && newDateTimeFuture[1] == '00:00:00') {
            duration += 30;
            i++;
            dateTimeFuture[0] = newDateTimeFuture[0]
            dateTime[0] = newDateTimeFuture[0];
          } else {
            break;
          }

          if(i+1 == yrlInformation.length)
          break;
        }
      }
      obj["Duration"] = duration.toString();

      var item = {
        combined: obj.Room + "," + obj["Building Name"]+ ","  + obj.Capacity + ","+ obj.Date+ "," + obj.Day+ "," + obj["Start Time"]+ "," + obj.Duration,
        room: obj.Room,
        building: obj["Building Name"],
        capacity: obj.Capacity,
        date: obj.Date, 
        start: obj["Start Time"], 
        duration: obj.Duration
      }
      yrlData.push(item);
    }

  }

  var paramsYrl = {
    TableName: "lib_rooms",
    KeyConditionExpression: "#bd = :buildingQuery",
    ExpressionAttributeNames: {
      "#bd": "building",
    },
    ExpressionAttributeValues: {
      ":buildingQuery": "Young Research Library",
    },
    IndexName: "building-index",
    ReturnConsumedCapacity: "TOTAL"
  };

  //compareDatabaseData(paramsYrl, yrlData)
  
})();