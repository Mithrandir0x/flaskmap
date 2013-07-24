
class POIContainer():
    def __init__(self, name = ""):
        self.id = None
        self.name = name
        self.content = []

class POI():
    def __init__(self, name = "", longitude = 0.0, latitude = 0.0):
        self.name = name
        self.longitude = longitude
        self.latitude = latitude

class Route(POIContainer):
    pass
