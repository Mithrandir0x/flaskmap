
import struct

def get_pois(path):
    pois = []
    with open(path, "rb") as stream:
        r_type = stream.read(1)
        byteCount = 1
        while r_type != "":
            if ord(r_type) == 0:
                # Deleted record
                # print "Deleted Record"
                length = int(stream.read(4))
                stream.read(length - 5)
                byteCount += length
            elif ord(r_type) == 1:
                # Skipper record (21 byte fixed size)
                # print "Skipper Record"
                length = string_to_signed_long(stream.read(4))
                x1 = string_to_signed_long(stream.read(4)) / 100000.0
                y1 = string_to_signed_long(stream.read(4)) / 100000.0
                x2 = string_to_signed_long(stream.read(4)) / 100000.0
                y2 = string_to_signed_long(stream.read(4)) / 100000.0
                byteCount += length
            elif ord(r_type) == 2:
                # Simple POI record (13 byte + name length + 1)
                # print "Simple POI Record"
                length = string_to_signed_long(stream.read(4))
                longitude = string_to_signed_long(stream.read(4)) / 100000.0
                latitude = string_to_signed_long(stream.read(4)) / 100000.0
                name = stream.read(length - 13)[0:-1].decode('latin-1').encode("utf-8")
                pois.append({'name': name, 'longitude': longitude, 'latitude': latitude})
                byteCount += length
            elif ord(r_type) == 3:
                # Extended POI record
                # print "Extended POI Record"
                length = string_to_signed_long(stream.read(4))
                longitude = string_to_signed_long(stream.read(4)) / 100000.0
                latitude = string_to_signed_long(stream.read(4)) / 100000.0
                p = get_string_until_zero(stream)
                q = get_string_until_zero(stream)
                extra = stream.read(l - len(p) - len(q) - 13 - 2) # -2 because both 0x00
                byteCount += length
            else:
                print "Corrupted OV2 file. byteCount:", byteCount
                raise Exception("Corrupted OV2 file.")
            r_type = stream.read(1)
    return pois

def save_pois(path, pois):
    with open(path, 'wb') as stream:
        for poi in pois:
            if poi['type'] == 2:
                pf = "<ci2l{0}s\x00".format(len(poi['name']))
                name = poi['name'].encode('utf8')
                length = len(poi['name']) + 14
                longitude = int(float(poi['longitude']) * 100000)
                latitude = int(float(poi['latitude']) * 100000)
                stream.write(struct.pack(pf, chr(2), length, longitude, latitude, name))
                stream.write(chr(0))

def string_to_signed_long(value):
    return struct.unpack("<l", value)[0] # Convert value to 4 byte signed long

def get_string_until_zero(stream):
    byte = stream.read(1)
    string = ""
    while ord(byte) != 0:
        string += byte
        byte = stream.read(1)
    return string
