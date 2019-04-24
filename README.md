# StudySmart_scrapers

A collection of all the scrapers being used for our application. These scrapers are built in Node.js and 
leverage Node's Puppeteer and Request modules. 

Each scraper is in a file of its own: 

* **reslife-scraper**: This scraper scrapes https://reslife.ucla.edu/reserve for study rooms on the hill that 
are available.

* **classroom-scraper**: This scraper scrapes a list of classrooms on campus and when they are being used
libraryinfo-scraper: scrapes library info 

* **librarystudyrooms-scraper**: This scraper scrapes http://calendar.library.ucla.edu/spaces?lid=4394&gid=0 
for study rooms in Powell Library and YRL that are available upto 3 days ahead from the current date. 

Before running these scrapers, it is advisable to download the required Node modules. This can be done using

```
npm install puppeteer --save
npm install request
```