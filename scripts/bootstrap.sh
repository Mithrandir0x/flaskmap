#!/bin/bash

set -e

if [ ! -f ~/.vagrantonce ]
then
    # Clean up virtualenv stuff and mongodb stuff
    # rm -rf /vagrant/venv
    # rm -rf /vagrant/.mongodb
    # rm -rf /etc/mongodb/data

    # Reset network to use static ip
    # cp /vagrant/scripts/interfaces /etc/network/interfaces

    # Install MongoDB package 10gen GPG Key
    apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10
    echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | tee /etc/apt/sources.list.d/10gen.list
    apt-get update

    # Install and execute MongoDB
    apt-get install mongodb-10gen
    # mongod --config /vagrant/mongodb.conf &

    mkdir -p /etc/mongodb/data
    chmod -R 755 /etc/mongodb

    # Install pip and virtualenv
    apt-get -qq --force-yes install python-pip
    #pip install virtualenv
    #virtualenv venv --distribute

    #cp ./venv /vagrant/venv/

    # cd /vagrant
    #source venv/bin/activate

    pip install -r /vagrant/requirements.txt
    
    touch ~/.vagrantonce
fi
