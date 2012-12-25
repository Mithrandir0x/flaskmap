
from flask import *
from functools import wraps
import base64
import datastore
import json
import os
import traceback

app = Flask(__name__)

def json_response(function):
    @wraps(function)
    def decorated_response(*args, **kwargs):
        response = make_response(json.dumps(function(*args, **kwargs)))
        response.headers['content-type'] = 'text/json'
        return response
    return decorated_response

@app.route('/')
def index():
    return render_template('index.html', go_map_api_key = app.config['GOOGLE_MAPS_API_KEY'])

@app.route('/poi/', methods=['GET'])
@json_response
def getPoiList():
    return datastore.all()

@app.route('/poi/', methods=['POST'])
@json_response
def createPoiContainer():
    id, name, pois = datastore.create_container()
    return {'id': id, 'name': name, 'content': pois}

def getOv2(uid):
    def stream_ov2():
        with open('./bin/data/{0}/poi.ov2'.format(uid), 'rb', buffering=4096) as chunk:
            yield chunk.read()
    return Response(stream_ov2(), mimetype='application/octet-stream')

@app.route('/poi/<uid>.ov2', methods=['GET'])
def getOv2File(uid):
    return getOv2(uid)

@app.route('/poi/<uid>/', methods=['PUT'])
def savePoiContainer(uid):
    meta = json.loads(request.data)
    try:
        datastore.save_container(uid, meta['name'], meta['content'])
        return make_response('')
    except Exception:
        print traceback.format_exc()
        abort(500)

@app.route('/poi/<uid>/', methods=['DELETE'])
def deletePoiContainer(uid):
    try:
        datastore.delete_container(uid)
        return make_response('')
    except Exception:
        abort(500)

@app.route('/ov2/', methods=['POST'])
@json_response
def processOv2():
    try:
        data = json.loads(request.data)
        name = data['name']
        bin = base64.decodestring(data['bin'][12:])
        if not bin[0] in '\x00\x01\x02\x03':
            raise Exception("Corrupted OV2 file.")
        id, name, pois = datastore.create_container(name = name, poi_bin_string = bin)
        return {'id': id, 'name': name, 'content': pois}
    except Exception:
        print traceback.format_exc()
        abort(500)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
            os.path.join(app.root_path, 'static'),
                'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    if not os.path.exists('./bin/data/'):
        os.makedirs('./bin/data/')
    if os.path.exists('./settings.py'):
        app.config.from_pyfile('./settings.py')
    app.run(host = '0.0.0.0', port=5000)
