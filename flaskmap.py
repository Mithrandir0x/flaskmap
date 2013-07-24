
from filestore import *
from flask import Flask, request, session, g, redirect, url_for, abort, \
     render_template, flash, _app_ctx_stack, make_response, Response, \
     send_from_directory
from functools import wraps
from models import *
import base64
import json
import os
import traceback

app = Flask(__name__)

def getOv2(datastore, uid):
    def stream_ov2():
        with datastore.get_stream_ov2(uid) as stream:
            yield stream.read()
    return Response(stream_ov2(), mimetype='application/octet-stream')

def json_response(function):
    @wraps(function)
    def decorated_response(*args, **kwargs):
        response = make_response(json.dumps(function(*args, **kwargs), default = lambda o: o.__dict__))
        response.headers['content-type'] = 'text/json'
        return response
    return decorated_response

def initializeStore():
    print "initialize store"
    if app.config['PROVIDER'] == 'file':
        return FileStore(app.config['FILESTORE_PATH'])
    elif app.config['PROVIDER'] == 'mongodb':
        raise Exception('Not implemented yet')
    else:
        raise Exception('Unknown data provider')

def getStore():
    print "getting store"
    top = _app_ctx_stack.top
    if not hasattr(top, '_store'):
        top._store = initializeStore()
    return top._store

@app.teardown_appcontext
def onTeardownRequest(exception):
    top = _app_ctx_stack.top
    if hasattr(top, '_store'):
        top._store.shutdown()

@app.route('/')
def index():
    return render_template('index.html', go_map_api_key = app.config['GOOGLE_MAPS_API_KEY'])

@app.route('/poi/', methods=['GET'])
@json_response
def getPoiList():
    datastore = getStore()
    return datastore.all_pois()

@app.route('/poi/', methods=['POST'])
@json_response
def createPoiContainer():
    datastore = getStore()
    return datastore.create_container()

@app.route('/poi/<uid>.ov2', methods=['GET'])
def getOv2File(uid):
    datastore = getStore()
    return getOv2(datastore, uid)

@app.route('/poi/<uid>/', methods=['PUT'])
def savePoiContainer(uid):
    datastore = getStore()
    meta = json.loads(request.data)
    content = []
    for poi in meta['content']:
        content.append(POI(poi['name'], poi['longitude'], poi['latitude']))
    try:
        datastore.save_container(uid, meta['name'], content)
        return make_response('')
    except Exception:
        print traceback.format_exc()
        abort(500)

@app.route('/poi/<uid>/', methods=['DELETE'])
def deletePoiContainer(uid):
    try:
        datastore = getStore()
        datastore.delete_container(uid)
        return make_response('')
    except Exception:
        abort(500)

@app.route('/ov2/', methods=['POST'])
@json_response
def processOv2():
    try:
        datastore = getStore()
        data = json.loads(request.data)
        name = data['name']
        bin = base64.decodestring(data['bin'][12:])
        if not bin[0] in '\x00\x01\x02\x03':
            raise Exception("Corrupted OV2 file.")
        return datastore.create_container(name = name, poi_bin_string = bin)
    except Exception:
        print traceback.format_exc()
        abort(500)

@app.route('/route/', methods=['GET'])
@json_response
def getRoutes():
    datastore = getStore()
    return datastore.all_routes()

@app.route('/route/', methods=['POST'])
@json_response
def createRoute():
    datastore = getStore()
    return datastore.create_route()

@app.route('/route/<uid>/', methods=['PUT'])
def saveRoute(uid):
    datastore = getStore()
    meta = json.loads(request.data)
    content = []
    for poi in meta['content']:
        content.append(POI(poi['name'], poi['longitude'], poi['latitude']))
    try:
        datastore.save_route(uid, meta['name'], content)
        return make_response('')
    except Exception:
        print traceback.format_exc()
        abort(500)

@app.route('/route/<uid>/', methods=['DELETE'])
def deleteRoute(uid):
    try:
        datastore = getStore()
        datastore.delete_route(uid)
        return make_response('')
    except Exception:
        abort(500)

@app.route('/favicon.ico')
def favicon():
    print "favicon"
    return send_from_directory(
            os.path.join(app.root_path, 'static'),
                'favicon.ico', mimetype='image/x-icon')

if __name__ == '__main__':
    if not os.path.exists('./bin/logs/'):
        os.makedirs('./bin/logs/')
    if os.path.exists('./settings.py'):
        app.config.from_pyfile('./settings.py', silent = False)
    else:
        raise Exception("No 'settings.py' file available!")
    app.run('0.0.0.0')
