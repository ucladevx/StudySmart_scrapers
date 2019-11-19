import requests
import psycopg2
import config
from bs4 import BeautifulSoup

"""
This module scrapes the UCLA Library Hours from the web.
URL: https://www.library.ucla.edu/hours.

Output format:
{
    "name":"Arts Library",
    "location":" 1400 Public Affairs Building, Los Angeles, CA 90095-1392",
    "phone":"(310) 206-5425",
    "image":"https://www.library.ucla.edu/sites/default/files/styles/thumbnail_large/public/location_map_images/map_arts.png?itok=0LT3XP_5",
    "department":
    [
    {
        "department_name":"Arts Library",
        "time":
        [
        {"dp_open_time":"1pm - 5pm","date":"Su 17"},
        {"dp_open_time":"9am - 5pm","date":"M 18"},
        {"dp_open_time":"8am - 9pm","date":"Tu 19"},
        {"dp_open_time":"8am - 9pm","date":"W 20"},
        {"dp_open_time":"8am - 9pm","date":"Th 21"},
        {"dp_open_time":"8am - 5pm","date":"F 22"},
        {"dp_open_time":"1pm - 5pm","date":"Sa 23"}
        ]
    },
    {
        "department_name":"CLICC Laptop & iPad Lending (Arts Library)",
        "time":
        [
        {"dp_open_time":"1pm - 4:30pm","date":"Su 17"},
        {"dp_open_time":"9am - 4:30pm","date":"M 18"},
        {"dp_open_time":"8am - 8:30pm","date":"Tu 19"},
        {"dp_open_time":"8am - 8:30pm","date":"W 20"},
        {"dp_open_time":"8am - 8:30pm","date":"Th 21"},
        {"dp_open_time":"8am - 4:30pm","date":"F 22"},
        {"dp_open_time":"1pm - 4:30pm","date":"Sa 23"}
        ]
    },
    {
        "department_name":"Reference Desk",
        "time":
        [
        {"dp_open_time":"Closed","date":"Su 17"},
        {"dp_open_time":"Closed","date":"M 18"},
        {"dp_open_time":"11am - 4pm","date":"Tu 19"},
        {"dp_open_time":"11am - 4pm","date":"W 20"},
        {"dp_open_time":"11am - 4pm","date":"Th 21"},
        {"dp_open_time":"11am - 4pm","date":"F 22"},
        {"dp_open_time":"Closed","date":"Sa 23"}]
    }
    ]
}
"""


"""
Database schema:

CREATE TABLE libraries (
    name text PRIMARY KEY,
    location text,
    phone text);

CREATE TABLE library_hours (
    library_name text,
    dep_name text,
    date text,
    times text,
    FOREIGN KEY (library_name) REFERENCES libraries(name),
    PRIMARY KEY (library_name, dep_name));
"""

def get_lib_info():

    # get HTML data
    url = 'https://www.library.ucla.edu/hours'
    response = requests.get(url)
    if response.status_code != 200:
        print("ERROR: Could not connect to https://www.library.ucla.edu/hours")
        exit()
    page = BeautifulSoup(response.content) # Need to specify parser

    # loop through each library 
    libraries = []
    library_hours = []
    for library in page.find_all('div', {'class': 'views-row'}):

        # extract library name, location, phone, & dates
        name = library.find('div', {'class': 'pane-node-title'}).find('a').text
        location = library.find('span', {'class': 'location__address-text'}).text.replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip(' ')
        phone = library.find('span', {'class':'location__phone-number'}).text
        libraries.append((name, location, phone))
        
        # each library has multiple departments, loop through each department
        for department in library.find('tbody').find_all('tr'):

            # extract department name and their hours
            table = department.find_all('td')
            dep_name = table[0].text.replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip(' ')
            for day in table[1:]:
                date = day.get('data-label')
                hours = day.text
                library_hours.append((name, dep_name, date, hours))
    
    return libraries, library_hours

def main(event=None, lambda_context=None): 
    # Print trigger event
    print("Triggered by:", event)

     # Get updated library info
    libraries, library_hours = get_lib_info()

    # Connect to database and insert data 
    try:
        conn = psycopg2.connect(host=config.host,
                                port=config.port,
                                database=config.database,
                                user=config.user,
                                password=config.password)
        curr = conn.cursor()
        print("Connected to database.")

        # Remove old library data
        curr.execute("TRUNCATE libraries, library_hours CASCADE;")

        # Insert new library data
        sql1 = "INSERT INTO libraries(name, location, phone) VALUES (%s, %s, %s);"
        sql2 = "INSERT INTO library_hours(library_name, dep_name, date, times) VALUES (%s, %s, %s, %s);"
        curr.executemany(sql1, libraries)
        curr.executemany(sql2, library_hours)

        # Commit & close database
        conn.commit()
        print("Updated data in database.")
        curr.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print("ERROR: ", error)
    finally:
        if conn is not None:
            conn.close()
            print('Database connection closed.')


if __name__ == '__main__':
    main()