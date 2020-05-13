import crawler

import boto3
import json




# ChIJq6qqIYq8woARFNfDahGA4Js

def lambda_handler(event, context):
    # Get the service resource.
    dynamodb = boto3.resource('dynamodb')

    # Instantiate a table resource object without actually
    # creating a DynamoDB table. Note that the attributes of this table
    # are lazy-loaded: a request is not made nor are the attribute
    # values populated until the attributes
    # on the table resource are accessed or its load() method is called.
    table = dynamodb.Table('lib_hours')

    # google does not have data for the commented out libraries
    libraries={
        'Powell Library':'Powell Library',
        'Charles E. Young Research Library': 'Research Library (Charles E. Young)',
        'The Study at Hedrick':'The Study at Hedrick',
        'UCLA Music Library':'Music Library',
        'Rosenfeld Library':'Management Library (Eugene and Maxine Rosenfeld)',
        'UCLA Science and Engineering Library':'Science and Engineering Library'
        # 'Hugh & Hazel Darling Law Library',
        # 'UCLA Louise M. Darling Biomedical Library',
        # 'Rudolph East Asian Library',
        # 'Arts Library',
        # 'Southern Regional Library Facility'
    }
    print(libraries)
    for Library in libraries.keys():

        print(Library)
        rating, rating_n, popular_times, current_popularity, time_spent= crawler.get_populartimes_from_search(Library)
        weekly_busyness=crawler.get_popularity_for_day(popular_times)[0]
        
        if current_popularity ==None:
            current_popularity=0
         
   
        # popularity={
        #     "name":libraries[Library],
        #     "weekly_busyness" :weekly_busyness,
        #     "current_busyness":current_popularity
        # }
        # table.update_item(
        # Item=popularity
        # )
        response = table.update_item(
            Key={"name":libraries[Library]},
            UpdateExpression="set weekly_busyness = :wb, current_busyness=:cb",
            ExpressionAttributeValues={
            ':wb': weekly_busyness,
            ':cb': current_popularity,
        },
        ReturnValues="UPDATED_NEW"
        )
        print(response);
lambda_handler(0,0)