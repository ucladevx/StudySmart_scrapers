const puppeteer = require('puppeteer');
const request = require('request');

/* 
JSON Format
{
    "Building Name": "Powell Library"
    "Room Number": "Group Study Room F"
    "Capacity": 6
    "Date": "February 5, 2019"
    "Day": "Tuesday"
    "Start Time": "1:00PM"
}
*/

(async function main() {
  
    try {
        
        const browser = await puppeteer.launch(/*{headless:false}*/);
        const [page] = await browser.pages();
        //Url to visit
        await page.goto('http://calendar.library.ucla.edu/allspaces');

        const result = await page.evaluate(async () => {
            //Wait for webpage to load (may need to change this 2000 ms)
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const rooms = document.querySelectorAll('.s-lc-eq-avail');
            //Save length to prevent function call overhead in for loop
            const num_rooms = rooms.length;
            //Empty array to append JSON objects to
            const data = [];
            
            for (let n = 0; n < num_rooms; n++) {
                var obj = new Object();
                //Get title attribute from Anchor html elemet
                const title = rooms[n].getAttribute('title');
                //Split by commas
                var splitByCommas = title.split(",");
                //Split first element of splitByCommas array by spaces
                var timeAndDay = splitByCommas[0].split(" ");
                //Split third element of splitByCommas array by dashes
                var yearAndRoom = splitByCommas[2].split("-"); 
                var room = yearAndRoom[1].split(" ");
                room = room[room.length-1];
                //data.push(room);
                
                //Specific study room numbers for Powell
                if (room ==  'A' || room == 'B' || room == 'C' || 
                room == 'D'|| room == 'E' || room == 'F') 
                    {
                        obj["Building Name"] = "Powell Library";
                        obj["Room"] = yearAndRoom[1].trim();
                        obj["Capacity"] = 8;
                        obj["Date"] = splitByCommas[1].trim() + yearAndRoom[0].trimRight();
                        obj["Day"] = timeAndDay[1].trim();
                        obj["Start Time"] = timeAndDay[0].trim();
                    }  
                
                //Specific room numbers for YRL study rooms
                else if(room ==  'G01'|| room ==  'G02' || room ==  'G03' || 
                room ==  'G04'|| room ==  'G05' || room ==  'G06' ||
                room ==  'G07' || room ==  'G08' || room ==  'G09'|| 
                room ==  'G10' || room ==  'G11' || room ==  'G12' || 
                room ==  'G13' || room ==  'G14'|| room ==  'G15') 
                    {
                        obj["Building Name"] = "Young Research Library";
                        obj["Room"] = yearAndRoom[1].trim();
                        obj["Capacity"] = 8;
                        obj["Date"] = splitByCommas[1].trim() + yearAndRoom[0].trimRight();
                        obj["Day"] = timeAndDay[1].trim();
                        obj["Start Time"] = timeAndDay[0].trim();
                    } 
                
                //Everything else must be a study pod in YRL
                else {
                        obj["Building Name"] = "Young Research Library";
                        obj["Room"] = yearAndRoom[1].trim();
                        obj["Capacity"] = 6;
                        obj["Date"] = splitByCommas[1].trim() + yearAndRoom[0].trimRight();
                        obj["Day"] = timeAndDay[1].trim();
                        obj["Start Time"] = timeAndDay[0].trim();
                    }
        
                //Add to data array*/
                data.push(obj);  
            }

        return data;
        });

      //  for (let i = 0; i < result.length; i++) {
            request.post({ url: "http://studysmart-env-2.dqiv29pdi2.us-east-1.elasticbeanstalk.com/librooms", headers: { 'content-type': 'application/json' }, body: JSON.stringify(result) }, function (err, response, body) {
              console.log(response.body)
              new Promise((resolve) => setTimeout(resolve, 10000));
            })
        //  }

        console.log(result);
        await browser.close();
    } 
    
    //If there is an error, write to console and exit
    catch (err) {
        console.error(err);
        return;
    }

})();