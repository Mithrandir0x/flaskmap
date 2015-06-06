
def save_route_to_stream(stream, pois):
    for i, poi in enumerate(pois):
        # longitude|latitude|description|type|
        name = poi.name.encode('ascii', 'ignore')
        longitude = int(float(poi.longitude) * 100000)
        latitude = int(float(poi.latitude) * 100000)
        type = 0
        enter = '\n'
        if i == 0:
            type = 4
        elif i == len(pois) - 1:
            type = 2
            enter = ''
        line = '%s|%s|%s|%s|%s' % ( longitude, latitude, name, type, enter )
        stream.write(unicode(line.encode('utf-8')))
