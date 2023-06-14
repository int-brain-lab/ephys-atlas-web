#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from datetime import datetime
from itertools import groupby
import json
from operator import itemgetter
import os
from pathlib import Path
import re
import shutil
import uuid
import unittest

from dateutil import parser
from flask import Flask, Response, request, jsonify, abort
# from flask_testing import TestCase


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

app = Flask(__name__)
ROOT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = ROOT_DIR / 'data/features'
FEATURES_FILE_REGEX = re.compile(r'^\d{8}-\S+\.json$')
DELETE_AFTER_DAYS = 180
BUCKET_UUID_LENGTH = 18
GLOBAL_KEY_PATH = Path('~/.ibl/globalkey').expanduser()
NATIVE_FNAMES = (
    'ephys', 'bwm_block', 'bwm_choice', 'bwm_feedback', 'bwm_stimulus')


# -------------------------------------------------------------------------------------------------
# Util functions
# -------------------------------------------------------------------------------------------------

def response_file_not_found(path):
    return jsonify(message=f'File not found: {path}'), 404


def response_json_file(path):
    if not path.exists():
        return response_file_not_found(path)
    with open(path, 'r') as f:
        text = f.read()
    return Response(text, headers={'Content-Type': 'application/json'})


def delete_old_files(dir_path=FEATURES_DIR):

    # Cutoff date
    today = datetime.date.today()
    cutoff_date = today - datetime.timedelta(days=DELETE_AFTER_DAYS)

    i = 0
    for file_name in dir_path.iterdir():
        # Go through all files YYYYMMDD-uuid.json
        if FEATURES_FILE_REGEX.match(str(file_name.name)):
            file_path = dir_path / file_name

            # # Extract the date portion from the filename
            # file_date_str = file_name[:8]
            # file_date = datetime.datetime.strptime(file_date_str, '%Y%m%d').date()

            # Find the last access date.
            try:
                file_date = datetime.date.fromtimestamp(
                    file_path.stat().st_atime)
            except OSError:
                pass

            # Delete files that have not been accessed recently.
            if file_date < cutoff_date:
                file_path.unlink()
                print(f"Deleted file: {file_name}")
                i += 1
    print(f"Successfully deleted {i} file(s) in `{dir_path}`.")
    return i


def save_features(path, json_data):
    assert path
    assert json_data
    with open(path, 'w') as f:
        json.dump(json_data, f, indent=1)


# -------------------------------------------------------------------------------------------------
# Bucket metadata
# -------------------------------------------------------------------------------------------------

def get_bucket_path(uuid):
    """
    NOTE: the bucket directory should contain the uuid but can also contain an alias
    """
    filenames = list(FEATURES_DIR.glob(f'*{uuid}*'))
    if not filenames:
        return None
    return filenames[0] if filenames else None


def get_bucket_metadata_path(uuid):
    path = get_bucket_path(uuid)
    if not path:
        return None
    return path / '_bucket.json'


def save_bucket_metadata(uuid, metadata):
    assert uuid
    assert metadata
    assert 'token' in metadata
    path = get_bucket_metadata_path(uuid)
    if not path:
        return
    with open(path, 'w') as f:
        json.dump(metadata, f, indent=1)


def load_bucket_metadata(uuid):
    path = get_bucket_metadata_path(uuid)
    if not path:
        return
    assert path.exists(), 'Bucket metadata file does not exist'
    with open(path, 'r') as f:
        metadata = json.load(f)
    # metadata['last_access_date'] = parser.parse(metadata['last_access_date'])
    return metadata


def new_token(max_length=None):
    token = str(uuid.uuid4())
    if max_length:
        token = token[:max_length]
    return token


def new_uuid():
    return new_token(BUCKET_UUID_LENGTH)


def now():
    return datetime.now().isoformat()


def create_bucket_metadata(bucket_uuid, alias=None,
                           description=None, url=None, tree=None):
    return {
        'uuid': bucket_uuid,
        'alias': alias,
        'url': url,
        'tree': tree,
        'description': description,
        'token': new_token(),
        'last_access_date': now(),
    }


def update_bucket_metadata(uuid, metadata):
    metadata_orig = load_bucket_metadata(uuid)
    metadata_orig.update(metadata)
    metadata_orig['last_access_date'] = now()
    save_bucket_metadata(uuid, metadata_orig)


# -------------------------------------------------------------------------------------------------
# Authorization
# -------------------------------------------------------------------------------------------------

def normalize_token(token):
    return token.strip().lower()


def extract_token():
    # Check if the Authorization header is present
    if 'Authorization' not in request.headers:
        raise RuntimeError(
            'Unauthorized access, require valid bearer authorization token.')

    # Extract the token from the Authorization header
    auth_header = request.headers.get('Authorization')
    auth_type, token = auth_header.split(' ')
    assert token
    return normalize_token(token)


def load_bucket_token(uuid):
    metadata = load_bucket_metadata(uuid)
    if not metadata:
        return
    if 'token' not in metadata:
        # TODO: generate new token?
        pass
    return metadata['token']


def authenticate_bucket(uuid):
    try:
        passed_token = extract_token()
    except RuntimeError as e:
        # print("Invalid authentication token")
        return
    expected_token = load_bucket_token(uuid)
    return passed_token == expected_token


def read_global_key():
    if not GLOBAL_KEY_PATH.exists():
        raise RuntimeError(f"File {GLOBAL_KEY_PATH} does not exist.")
    with open(GLOBAL_KEY_PATH, 'r') as f:
        return normalize_token(f.read())


def authorize_global_key(key):
    return normalize_token(key) == normalize_token(read_global_key())


# -------------------------------------------------------------------------------------------------
# Error handlers
# -------------------------------------------------------------------------------------------------

@app.errorhandler(404)
def resource_not_found(e):
    return jsonify(error=str(e)), 404


# -------------------------------------------------------------------------------------------------
# Business logic
# -------------------------------------------------------------------------------------------------

def get_bucket(uuid):
    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path or not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the list of JSON files in the bucket directory.
    fnames = bucket_path.glob('*.json')
    fnames = sorted(_.stem for _ in fnames if not _.stem.startswith('_'))

    # Retrieve the bucket metadata.
    metadata = load_bucket_metadata(uuid)

    # NOTE: remove the token from the metadata dictionary.
    del metadata['token']

    return {'features': fnames, 'metadata': metadata}


def create_bucket(uuid, metadata, alias=None):
    assert uuid
    assert metadata
    assert 'uuid' in metadata
    assert 'token' in metadata
    assert metadata['token']

    # Ensure no bucket with the same uuid exists.
    if isinstance(get_bucket(uuid), dict):
        return f'Bucket {uuid} already exists.', 409

    # Create the bucket directory.
    bucket_dir = FEATURES_DIR / f'{alias or ""}{"_" if alias else ""}{uuid}'
    assert not bucket_dir.exists()
    bucket_dir.mkdir(parents=True, exist_ok=True)

    # Save the metadata (including the token).
    save_bucket_metadata(uuid, metadata)

    return f'Bucket {uuid} successfully created.', 200


def create_features(uuid, fname, json_data, patch=False):
    assert uuid
    assert fname

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not patch and features_path.exists():
        return f'Features {fname} already exist, use a PATCH request instead.', 409
    if patch and not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Save the features.
    save_features(features_path, json_data)

    return f'Features {fname} successfully {"created" if not patch else "patched"} in bucket {uuid}.', 200


def delete_features(uuid, fname):
    assert uuid
    assert fname

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Save the features.
    assert features_path.exists()
    try:
        os.remove(features_path)
        return f"Successfully deleted {features_path}", 200
    except Exception as e:
        return f"Unable to delete {features_path}", 500


# -------------------------------------------------------------------------------------------------
# REST endpoint: create a new bucket
# POST /api/buckets (uuid, token)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets', methods=['POST'])
def api_create_bucket():
    # Global key authentication is required to create a new bucket.
    if not authorize_global_key(extract_token()):
        return 'Unauthorized access.', 401

    # Get the parameters passed in the POST request.
    data = request.json
    assert data

    uuid = data['uuid']
    metadata = data['metadata']

    return create_bucket(uuid, metadata)


# -------------------------------------------------------------------------------------------------
# REST endpoint: get bucket information
# GET /api/buckets/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['GET'])
def api_get_bucket(uuid):
    return jsonify(get_bucket(uuid))


# -------------------------------------------------------------------------------------------------
# REST endpoint: create new features in a bucket
# POST /api/buckets/<uuid> (fname, json)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['POST'])
def api_post_features(uuid):
    # Check authorization to upload new features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401
    fname = request.json.get('fname', '')
    return create_features(uuid, fname, request.json)


# -------------------------------------------------------------------------------------------------
# REST endpoint: retrieve features
# GET /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['GET'])
def api_get_features(uuid, fname):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Return the contents of the features file.
    return response_json_file(features_path)


# -------------------------------------------------------------------------------------------------
# REST endpoint: modify existing features
# PATCH /api/buckets/<uuid>/<fname> (json)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['PATCH'])
def api_patch_features(uuid, fname):
    # Check authorization to change features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401
    return create_features(uuid, fname, request.json, patch=True)


# -------------------------------------------------------------------------------------------------
# REST endpoint: delete features
# DELETE /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['DELETE'])
def api_delete_features(uuid, fname):
    # Check authorization to change features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401
    return delete_features(uuid, fname)


# -------------------------------------------------------------------------------------------------
# Tests
# -------------------------------------------------------------------------------------------------

class TestApp(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def ok(self, response):
        self.assertEqual(response.status_code, 200)

    def test_1(self):
        # Ensure the directory does not exist before running the tests.
        path = FEATURES_DIR / 'myuuid'
        if path.exists():
            shutil.rmtree(path)

        # Bucket metadata.
        alias = 'myalias'
        description = 'mydesc'
        url = 'https://ephysatlas.internationalbrainlab.org'
        tree = {
            'level1': {
                'level2': {
                    'feature1': 'fet1',
                    'feature2': 'fet2',
                }
            }
        }
        uuid = 'myuuid'
        metadata = create_bucket_metadata(
            uuid, alias=alias, description=description, url=url, tree=tree)
        token = metadata['token']

        # Create a bucket.
        payload = {'token': token, 'uuid': uuid, 'metadata': metadata}
        globalkey = read_global_key()
        headers = {
            'Authorization': f'Bearer {globalkey}',
            'Content-Type': 'application/json',
        }
        response = self.client.post(
            '/api/buckets', json=payload, headers=headers)
        self.ok(response)

        # Authorization HTTP header using a bearer token.
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }

        # Retrieve bucket information.
        response = self.client.get(f'/api/buckets/{uuid}')
        self.ok(response)
        self.assertEqual(response.json['features'], [])
        self.assertEqual(response.json['metadata']['alias'], alias)
        self.assertEqual(response.json['metadata']['description'], description)
        self.assertEqual(response.json['metadata']['url'], url)
        self.assertEqual(response.json['metadata']['tree'], tree)

        # Create features.
        fname = 'fet1'
        data = {fname: {'data': {0: {'mean': 42}, 1: {
            'mean': 420}}, 'statistics': {'mean': 21}}}
        payload = {'fname': fname, 'json': data}
        # NOTE: fail if no authorization header.
        response = self.client.post(f'/api/buckets/{uuid}', json=payload)
        self.assertEqual(response.status_code, 401)
        response = self.client.post(
            f'/api/buckets/{uuid}', json=payload, headers=headers)
        self.ok(response)

        # List features in the bucket.
        response = self.client.get(f'/api/buckets/{uuid}')
        self.ok(response)
        self.assertEqual(response.json['features'], ['fet1'])

        # Retrieve features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.ok(response)
        self.assertEqual(response.json['json'][fname]['data']['0']['mean'], 42)
        self.assertEqual(response.json['json']
                         [fname]['data']['1']['mean'], 420)

        # Patch features.
        data = {fname: {'data': {0: {'mean': 84}}, 'statistics': {'mean': 48}}}
        payload = {'fname': fname, 'json': data}
        response = self.client.patch(
            f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.ok(response)

        # Retrieve modified features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(response.json['json'][fname]['data']['0']['mean'], 84)
        # NOTE: the JSON data is completely replaced, keys that were present before but not now
        # are deleted.
        self.assertTrue('1' not in response.json['json'][fname]['data'])

        # Delete the features and check they cannot be retrieved anymore.
        response = self.client.delete(
            f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(response.status_code, 404)


# -------------------------------------------------------------------------------------------------
# Default features
# -------------------------------------------------------------------------------------------------

def iter_fset_features(fset):
    assert fset
    json_path = ROOT_DIR / 'data/json' / f"features_{fset}.json"
    with open(json_path, 'r') as f:
        contents = json.load(f)
    for mapping, fet in contents.items():
        for fname, d in fet.items():
            yield fname, mapping, d


def create_ephys_features():
    alias = 'ephys'
    description = 'Ephys atlas'
    tree = None

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket {alias} {bucket_uuid}")
        metadata = create_bucket_metadata(
            bucket_uuid, alias=alias, description=description, tree=tree)
        assert 'token' in metadata
        create_bucket(bucket_uuid, metadata, alias=alias)

    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']
    print(bucket_uuid)

    # Go through the features and mappings.
    for fname, mappings in groupby(
            sorted(iter_fset_features('ephys'), key=itemgetter(0)), itemgetter(0)):
        print(fname)
        json_data = {mapping: d for _, mapping, d in mappings}
        print(create_features(bucket_uuid, fname, json_data))


def create_bwm_features():
    alias = 'bwm'
    description = 'Brain wide map'
    sets = ('block', 'choice', 'feedback', 'stimulus')
    tree = {
        f'{set}': {
            'decoding': {
                'main': f'{set}_decoding',
                'effect': f'{set}_decoding_effect',
                'frac_significant': f'{set}_decoding_frac_significant',
                'significant': f'{set}_decoding_significant',
            },
            'euclidean': {
                'effect': f'{set}_euclidean_effect',
                'latency': f'{set}_euclidean_latency',
                'significant': f'{set}_euclidean_significant',
            },
            'mannwhitney': {
                'effect': f'{set}_mannwhitney_effect',
                'significant': f'{set}_mannwhitney_significant'
            },

            'glm_effect': f'{set}_glm_effect',
            'manifold': f'{set}_manifold',
            'single_cell': f'{set}_single_cell',
        }
        for set in sets
    }

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket {alias} {bucket_uuid}")
        metadata = create_bucket_metadata(bucket_uuid, alias=alias, description=description, tree=tree)
        assert 'token' in metadata
        create_bucket(bucket_uuid, metadata, alias=alias)

    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']

    # Go through the features and mappings.
    for set in sets:
        for fname, mappings in groupby(sorted(iter_fset_features(
                f'bwm_{set}'), key=itemgetter(0)), itemgetter(0)):
            fname = f'{set}_{fname}'
            print(fname)
            json_data = {mapping: d for _, mapping, d in mappings}
            create_features(bucket_uuid, fname, json_data)


if __name__ == '__main__':
    # app.run()
    unittest.main()
    # create_ephys_features()
    # create_bwm_features()
