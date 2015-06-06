
from models import *
from uuid import uuid4
from shutil import copy, rmtree
from time import time
import io
import json
import os
import ov2
import itn

class FileStore():
    def __init__(self, datapath = './bin/data/'):
        self.datapath = datapath
        self.poiDataPath = datapath + 'pois/'
        self.routeDataPath = datapath  + 'routes/'
        if not os.path.exists(datapath):
            os.makedirs(datapath)
            os.makedirs(self.poiDataPath)
            os.makedirs(self.routeDataPath)

    def all_pois(self):
        poiList = []
        lists = os.listdir(self.poiDataPath)
        for folder in lists:
            path = self.poiDataPath + folder
            with io.open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
                if not meta['deleted']:
                    container = POIContainer(meta['name'])
                    container.id = folder
                    container.content = []
                    if os.path.exists('%s/poi.ov2' % path):
                        with io.open('%s/poi.ov2' % path, 'rb') as stream:
                            container.content = ov2.get_pois_from_stream(stream)
                    poiList.append(container)
        return poiList

    def create_container(self, name = "Nuevo mapa", pois = [], poi_bin_string = None):
        uid = uuid4().hex
        container = POIContainer(name)
        container.id = uid
        path = '%s/%s/' % ( self.poiDataPath, uid )
        os.mkdir(path)
        ts = int(time())
        with io.open('%s/meta.json' % path, 'w') as metafile:
            metafile.write(unicode(json.dumps({
                'name': name,
                'created_at': ts,
                'updated_at': ts,
                'deleted': False
                })))
        if len(pois) > 0:
            with io.open('%s/poi.ov2' % path, 'wb') as stream:
                ov2.save_pois_to_stream(stream, pois)
        if poi_bin_string:
            with io.open('%s/poi.ov2' % path, 'wb') as stream:
                stream.write(poi_bin_string)
            with io.open('%s/poi.ov2' % path, 'rb') as stream:
                container.content = ov2.get_pois_from_stream(stream)
        return container

    def get_container(self, uid, evenDelete = False):
        path = '%s/%s/' % ( self.poiDataPath, uid )
        if os.path.exists(path):
            with io.open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
                if not meta['deleted'] or evenDelete:
                    container = POIContainer(meta['name'])
                    container.id = uid
                    container.content = []
                    if os.path.exists('%s/poi.ov2' % path):
                        with io.open('%s/poi.ov2' % path, 'rb') as stream:
                            container.content = ov2.get_pois_from_stream(stream)
                    return container
                else:
                    return None
            raise Exception('Malformed meta.json file at [%s]' % uid)
        raise Exception('Unknown UID')

    def save_container(self, uid, name, content):
        path = '%s/%s/' % ( self.poiDataPath, uid )
        if os.path.exists(path):
            meta = None
            ts = int(time())
            with open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
            if meta:
                with io.open('%s/meta.json' % path, 'w') as metafile:
                    metafile.write(unicode(json.dumps({ 
                        'name': name,
                        'created_at': meta['created_at'],
                        'updated_at': ts,
                        'deleted': meta['deleted']
                        })))
                with io.open('%s/poi.ov2' % path, 'wb') as stream:
                    ov2.save_pois_to_stream(stream, content)
                return
            raise Exception('Malformed meta.json file at [%s]' % uid)
        raise Exception('Unknown UID')

    def delete_container(self, uid, force = False):
        path = '%s/%s/' % ( self.poiDataPath, uid )
        if os.path.exists(path):
            if force:
                rmtree(path)
                return
            meta = None
            ts = int(time())
            with io.open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
            if meta:
                with io.open('%s/meta.json' % path, 'w') as metafile:
                    metafile.write(unicode(json.dumps({ 
                        'name': meta['name'],
                        'created_at': meta['created_at'],
                        'updated_at': ts,
                        "deleted": True
                        })))
                return
            raise Exception('Malformed meta.json file at [%s]' % uid)
        raise Exception('Unknown UID')

    def get_stream_ov2(self, uid):
        class StreamOV2():
            def __init__(self, datapath = None, uid = None):
                self.uid = uid
                self.poiDataPath = datapath
                self.stream = None
            def __enter__(self):
                self.stream = io.open('%s/%s/poi.ov2' % ( self.poiDataPath, self.uid ), 'rb', buffering = 4096)
                return self.stream
            def __exit__(self, ex_type, ex_value, traceback):
                if self.stream:
                    self.stream.close()
        return StreamOV2(self.poiDataPath, uid)

    def _load_route(self, folder):
        path = self.routeDataPath + folder
        route = None
        with io.open('%s/meta.json' % path) as metafile:
            meta = json.loads(metafile.read())
            if not meta['deleted']:
                route = Route(meta['name'])
                route.id = folder
                route.content = []
                if os.path.exists('%s/route.json' % path):
                    with io.open('%s/route.json' % path, 'rb') as stream:
                        route.content = json.load(stream)
        return route

    def all_routes(self):
        routeList = []
        lists = os.listdir(self.routeDataPath)
        for folder in lists:
            path = self.routeDataPath + folder
            with io.open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
                if not meta['deleted']:
                    route = Route(meta['name'])
                    route.id = folder
                    route.content = []
                    if os.path.exists('%s/route.json' % path):
                        with io.open('%s/route.json' % path, 'rb') as stream:
                            route.content = json.load(stream)
                    routeList.append(route)
        return routeList

    def create_route(self, name = "Nueva ruta", pois = [], poi_id = None):
        uid = uuid4().hex
        if poi_id != None:
            path = '%s/%s/' % ( self.poiDataPath, poi_id )
            cpPath = '%s/%s/' % ( self.poiDataPath, uid )
            if os.path.exists(path):
                copy(path, cpPath)
                return self._load_route(uid)
            else:
                raise Exception('Unknown UID')
        container = Route(name)
        container.id = uid
        path = '%s/%s/' % ( self.routeDataPath, uid )
        os.mkdir(path)
        ts = int(time())
        with io.open('%s/meta.json' % path, 'w') as metafile:
            metafile.write(unicode(json.dumps({
                'name': name,
                'created_at': ts,
                'updated_at': ts,
                'deleted': False
                })))
        if len(pois) > 0:
            with io.open('%s/route.json' % path, 'w') as stream:
                stream.write(unicode(json.dumps(pois)))
        return container

    def save_route(self, uid, name, content):
        path = '%s/%s/' % ( self.routeDataPath, uid )
        if os.path.exists(path):
            meta = None
            ts = int(time())
            with open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
            if meta:
                with io.open('%s/meta.json' % path, 'w') as metafile:
                    metafile.write(unicode(json.dumps({ 
                        'name': name,
                        'created_at': meta['created_at'],
                        'updated_at': ts,
                        'deleted': meta['deleted']
                        })))
                with io.open('%s/route.json' % path, 'w') as stream:
                    stream.write(unicode(json.dumps(content, default = lambda o: o.__dict__)))
                with io.open('%s/route.itn' % path, 'w') as stream:
                    itn.save_route_to_stream(stream, content)
                return
            raise Exception('Malformed meta.json file at [%s]' % uid)
        raise Exception('Unknown UID')

    def delete_route(self, uid):
        path = '%s/%s/' % ( self.routeDataPath, uid )
        if os.path.exists(path):
            meta = None
            ts = int(time())
            with io.open('%s/meta.json' % path) as metafile:
                meta = json.loads(metafile.read())
            if meta:
                with io.open('%s/meta.json' % path, 'w') as metafile:
                    metafile.write(unicode(json.dumps({ 
                        'name': meta['name'],
                        'created_at': meta['created_at'],
                        'updated_at': ts,
                        "deleted": True
                        })))
                return
            raise Exception('Malformed meta.json file at [%s]' % uid)
        raise Exception('Unknown UID')

    def get_stream_itn(self, uid):
        class StreamITN():
            def __init__(self, datapath = None, uid = None):
                self.uid = uid
                self.routeDataPath = datapath
                self.stream = None
            def __enter__(self):
                self.stream = io.open('%s/%s/route.itn' % ( self.routeDataPath, self.uid ), 'r', buffering = 4096)
                return self.stream
            def __exit__(self, ex_type, ex_value, traceback):
                if self.stream:
                    self.stream.close()
        return StreamITN(self.routeDataPath, uid)

    def shutdown(self):
        pass
