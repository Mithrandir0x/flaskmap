
from models import *
from uuid import uuid4
from pymongo import MongoClient
from pymongo.son_manipulator import SONManipulator

class MongoDBStore():
    class Transformer(SONManipulator):
        def transform_incoming(self, son, collection):
            pass
        def transform_outgoing(self, son, collection):
            pass

    def __init__(self, host, port):
        self.client = MongoClient(host, port)
        self.db = self.client.flaskmap
        self.db.add_son_manipulator(Transformer())
    def all(self):
        poiList = []
        for poic in self.db['poi-containers']:
            poiList.append(POIContainer(poic['name']))
            for poi in poic.content:
                poiList.content
        return poiList
    def create_container(self, name = "Nuevo mapa", pois = [], poi_bin_string = None):
        uid = uuid4().hex
        container = POIContainer(name)
        container.id = uid
        self.db['poi-containers'].insert(container)
        return container
    def save_container(self, uid, name, content):
        c = self.db['poi-containers']
        container = c.find_one({'uid': uid})
        if container:
            container.name = name
            container.content = content
            c.update({'uid': container.uid}, container)
            return
        raise Exception('Unknown UID')
    def delete_container(self, uid):
        raise Exception('Not implemented yet.')
    def get_stream_ov2(self, uid):
        raise Exception('Not implemented yet.')
    def shutdown(self):
        self.client.disconnect()
    def __getc_poi_containers(self):
        return self.db['poi-containers']
