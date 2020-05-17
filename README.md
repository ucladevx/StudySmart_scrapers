# StudySmart_scrapers

A collection of all the scrapers being used for our application. Some scrapers are built in Node.js and 
leverage Node's Puppeteer and Request modules. Others are written using Python3.

Each scraper is in a file of its own: 

* **reslife-scraper**: This scraper scrapes https://reslife.ucla.edu/reserve for study rooms on the hill that 
are available.

* **classroom-scraper**: This scraper scrapes https://www.registrar.ucla.edu/desktopmodules/ClassRoomSearch/  for a list of classrooms on campus and when they are being used

* **librooms-scraper**: This scraper scrapes http://calendar.library.ucla.edu/spaces?lid=4394&gid=0 
for study rooms in Powell Library and YRL that are available upto 3 days ahead from the current date.

* **libinfo-scraper**: This scraper scrapes https://www.library.ucla.edu/hours for library info. Information includes library dates & hours. This scraper is written in python3 intsead of javascript (BeautifulSoup).
