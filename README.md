Testing the app
---------------

1.- Clone the repository

2.- In the <strong>./sql</strong> folder you will find a couple of scripts to initialize the BD:
* <strong>challenge_init_data.sql</strong>: Initializes an empty database, just with information about the countries
* <strong>challenge_big_data.sql</strong>: Use this script to test the application on an already populated database (5500 products and 15000 orders)

3.- Copy the app into your webserver and follow the normal symfony installation process, use the following commands from the app base directory (you will need [1] installed):

```
composer install --optimize-autoloader
php app/console cache:clear --env=prod --no-debug
php app/console assetic:dump --env=prod --no-debug
```

4.- Browse to http://localhost/challenge/web/ to test the application 


[1]: http://getcomposer.org/download/        "composer"