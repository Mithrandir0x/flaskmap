
import json
import os
import ov2
import shutil
import time
import uuid

dataPath = './bin/data/'

def all():
    poiList = []
    lists = os.listdir(dataPath)
    for folder in lists:
        path = dataPath + folder
        with open('{0}/meta.json'.format(path)) as metafile:
            meta = json.loads(metafile.read())
            if not meta['deleted']:
                content = []
                if os.path.exists('{0}/poi.ov2'.format(path)):
                    content = ov2.get_pois('{0}/poi.ov2'.format(path))
                poiList.append({ 'name': meta['name'], 'id': folder, 'content': content })
    return poiList

def create_container(name = "Nuevo mapa", pois = [], poi_bin_string = None):
    uid = uuid.uuid4().hex
    path = '{0}/{1}/'.format(dataPath, uid)
    os.mkdir(path)
    ts = int(time.time())
    with open('{0}/meta.json'.format(path), 'w') as metafile:
        metafile.write(json.dumps({ 
            'name': name,
            'created_at': ts,
            'updated_at': ts,
            'deleted': False 
            }))
    if len(pois) > 0:
        ov2.save_pois('{0}/poi.ov2'.format(path), pois)
    if poi_bin_string:
        with open('{0}/poi.ov2'.format(path), 'wb') as stream:
            stream.write(poi_bin_string)
        pois = ov2.get_pois('{0}/poi.ov2'.format(path))
    return (uid, name, pois)

def save_container(uid, name, content):
    path = '{0}/{1}/'.format(dataPath, uid)
    if os.path.exists(path):
        meta = None
        ts = int(time.time())
        with open('{0}/meta.json'.format(path)) as metafile:
            meta = json.loads(metafile.read())
        if meta:
            with open('{0}/meta.json'.format(path), 'w') as metafile:
                metafile.write(json.dumps({ 
                    'name': name,
                    'created_at': meta['created_at'],
                    'updated_at': ts,
                    'deleted': meta['deleted']
                    }))
            pois = []
            for poi in content:
                pois.append({
                    'type': 2,
                    'name': poi['name'],
                    'longitude': poi['longitude'],
                    'latitude': poi['latitude']
                    })
            ov2.save_pois('{0}/poi.ov2'.format(path), pois)
            return
        raise Exception('Malformed meta.json file at [%s]' % uid)
    raise Exception('Unknown UID')

def delete_container(uid, force = True):
    path = '{0}/{1}/'.format(dataPath, uid)
    if os.path.exists(path):
        meta = None
        ts = int(time.time())
        with open('{0}/meta.json'.format(path)) as metafile:
            meta = json.loads(metafile.read())
        if meta:
            with open('{0}/meta.json'.format(path), 'w') as metafile:
                metafile.write(json.dumps({ 
                    'name': meta['name'],
                    'created_at': meta['created_at'],
                    'updated_at': ts,
                    "deleted": True
                    }))
            return
        raise Exception('Malformed meta.json file at [%s]' % uid)
    raise Exception('Unknown UID')
