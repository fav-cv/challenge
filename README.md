Testing the app
---------------

1.- Clone the repository

2.- In the folder *./sql* you will find a couple of scripts to initialize the BD:
* *challenge_init_data.sql*: Initializes an empty database, just with information about the countries
* *challenge_big_data.sql*: Use this script to test the application on an already populated database (5500 products and 15000 orders)

3.- Copy the app into your webserver and follow the normal symfony installation process, use the following commands from the app base directory (you will need [composer|http://getcomposer.org/download/] installed):
* composer install --optimize-autoloader
* php app/console cache:clear --env=prod --no-debug
* php app/console assetic:dump --env=prod --no-debug

4.- Browse to http://localhost/challenge/web/ to test the application 
