
from models import *
from uuid import uuid4
from time import time
import io
import json
import os
import ov2

class FileStore():
    def __init__(self, datapath = './bin/data/'):
        if not os.path.exists(datapath):
            os.makedirs(datapath)
        self.datapath = datapath
    
    def all(self):
        poiList = []
        lists = os.listdir(self.datapath)
        for folder in lists:
            path = self.datapath + folder
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
        path = '%s/%s/' % ( self.datapath, uid )
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

    def save_container(self, uid, name, content):
        path = '%s/%s/' % ( self.datapath, uid )
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

    def delete_container(self, uid, force = True):
        path = '%s/%s/' % ( self.datapath, uid )
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

    def get_stream_ov2(self, uid):
        class StreamOV2():
            def __init__(self, datapath = None, uid = None):
                self.uid = uid
                self.datapath = datapath
                self.stream = None
            def __enter__(self):
                self.stream = io.open('%s/%s/poi.ov2' % ( self.datapath, self.uid ), 'rb', buffering = 4096)
                return self.stream
            def __exit__(self, ex_type, ex_value, traceback):
                if self.stream:
                    self.stream.close()
        return StreamOV2(self.datapath, uid)

    def shutdown(self):
        pass
