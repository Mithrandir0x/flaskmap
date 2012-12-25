flaskmap
========

This is a web application that aims to help create and manage lists of points of interest in OV2 format.

## Getting started

`NOTE` You should have Python 2.7 on your system before using flaskmap.

`NOTE` And also, you should [install Flask](http://flask.pocoo.org/docs/installation/).

Simply clone the repository:

`git clone https://github.com/mithrandir0x/flaskmap.git`

Edit `settings.py` and add your Google Maps' API key:

`GOOGLE_MAPS_API_KEY = "YOUR_API_KEY"`

Fire up flaskmap:

`python app.py`

And go to [localhost:5000](http://localhost:5000/)

##Usage

When you enter for the first time to flaskmap, the screen will be divided by two pannels: the Google Map and the POI list editor.

Just create a new POI list using the `Create new list` button. You can change the name of this list just by editing the `Name` textbox.

Adding a new POI is dead simple:

- Navigate to the spot where you wish to add the new POI.
- Double click over the point, and voila, the new POI has been added to the list.
- You can change the text of the new POI

The lists are saved automatically every 10 minutes.