FROM php:5.5-apache
RUN a2enmod rewrite
RUN docker-php-ext-install pdo pdo_mysql
