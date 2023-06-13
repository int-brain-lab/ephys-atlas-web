#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from datetime import datetime
import json
import os
from pathlib import Path
import re
import shutil
import uuid
import unittest

from dateutil import parser
from flask import Flask, Response, request, jsonify
# from flask_testing import TestCase


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

app = Flask(__name__)
ROOT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = ROOT_DIR / 'data/features'
FEATURES_FILE_REGEX = re.compile(r'^\d{8}-\S+\.json$')
DELETE_AFTER_DAYS = 180
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


def save_features(path):
    json_data = request.json
    assert json_data
    with open(path, 'w') as f:
        json.dump(json_data, f, indent=1)


# -------------------------------------------------------------------------------------------------
# Bucket metadata
# -------------------------------------------------------------------------------------------------

def get_bucket_path(uuid):
    return list(FEATURES_DIR.glob(f'*{uuid}*'))[0]


def get_bucket_metadata_path(uuid):
    return get_bucket_path(uuid) / '_bucket.json'


def save_bucket_metadata(uuid, metadata):
    assert uuid
    assert metadata
    assert 'token' in metadata
    with open(get_bucket_metadata_path(uuid), 'w') as f:
        json.dump(metadata, f)


def load_bucket_metadata(uuid):
    path = get_bucket_metadata_path(uuid)
    assert path.exists(), 'Bucket metadata file does not exist'
    with open(path, 'r') as f:
        metadata = json.load(f)
    # metadata['last_access_date'] = parser.parse(metadata['last_access_date'])
    return metadata


def new_token():
    return str(uuid.uuid4())


def now():
    return datetime.now().isoformat()


def create_bucket_metadata(alias=None, description=None, url=None, tree=None):
    return {
        'url': url,
        'alias': alias,
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
        return 'Unauthorized access, require valid bearer authorization token.', 401

    # Extract the token from the Authorization header
    auth_header = request.headers.get('Authorization')
    auth_type, token = auth_header.split(' ')
    assert token
    return normalize_token(token)


# def save_bucket_token(uuid, token):
#     update_bucket_metadata(uuid, {'token': token})


def load_bucket_token(uuid):
    metadata = load_bucket_metadata(uuid)
    if 'token' not in metadata:
        # TODO: generate new token?
        pass
    return metadata['token']


def authenticate_bucket(uuid):
    passed_token = extract_token()
    expected_token = load_bucket_token(uuid)
    return passed_token == expected_token


# -------------------------------------------------------------------------------------------------
# REST endpoint: create a new bucket
# POST /api/buckets (uuid, token)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets', methods=['POST'])
def create_bucket():

    # Get the parameters passed in the POST request.
    data = request.json
    assert data

    uuid = data['uuid']
    assert uuid

    metadata = data['metadata']
    assert metadata
    assert 'token' in metadata

    # Create the bucket directory.
    bucket_dir = FEATURES_DIR / uuid
    if bucket_dir.exists():
        return 'Bucket already exists.', 409
    bucket_dir.mkdir(parents=True, exist_ok=True)

    # Save the metadata (including the token).
    save_bucket_metadata(uuid, metadata)

    return jsonify(message=f'Bucket {uuid} successfully created.')


# -------------------------------------------------------------------------------------------------
# REST endpoint: get bucket information
# GET /api/buckets/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['GET'])
def get_bucket(uuid):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the list of JSON files in the bucket directory.
    fnames = bucket_path.glob('*.json')
    fnames = sorted(_.stem for _ in fnames if not _.stem.startswith('_'))

    # Retrieve the bucket metadata.
    metadata = load_bucket_metadata(uuid)

    # NOTE: remove the token from the metadata dictionary.
    del metadata['token']

    return jsonify({'features': fnames, 'metadata': metadata})


# -------------------------------------------------------------------------------------------------
# REST endpoint: create new features in a bucket
# POST /api/buckets/<uuid> (fname, json)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['POST'])
def post_features(uuid):
    # Check authorization to upload new features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the fname.
    fname = request.json.get('fname', '')
    assert fname

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if features_path.exists():
        return f'Features {fname} already exist, use a PATCH request instead.', 409

    # Save the features.
    save_features(features_path)

    return jsonify(message=f'Features {fname} successfully created in bucket {uuid}.')


# -------------------------------------------------------------------------------------------------
# REST endpoint: retrieve features
# GET /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['GET'])
def get_features(uuid, fname):

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
def patch_features(uuid, fname):
    # Check authorization to change features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Save the features.
    save_features(features_path)

    return jsonify(message=f'Feature {fname} successfully patched in bucket {uuid}.')


# -------------------------------------------------------------------------------------------------
# REST endpoint: delete features
# DELETE /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['DELETE'])
def delete_features(uuid, fname):
    # Check authorization to change features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized access.', 401

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Save the features.
    try:
        os.remove(features_path)
        # print(f"Successfully deleted {features_path}")
        return jsonify(message=f"Successfully deleted {features_path}")
    except Exception as e:
        # print(f"Unable to delete {features_path}")
        return jsonify(message=f"Unable to delete {features_path}")


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
        metadata = create_bucket_metadata(alias=alias, description=description, url=url, tree=tree)
        token = metadata['token']

        # Create a bucket.
        uuid = 'myuuid'
        payload = {'token': token, 'uuid': uuid, 'metadata': metadata}
        response = self.client.post('/api/buckets', json=payload)
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
        data = {fname: {'data': {0: {'mean': 42}, 1: {'mean': 420}}, 'statistics': {'mean': 21}}}
        payload = {'fname': fname, 'json': data}
        # NOTE: fail if no authorization header.
        response = self.client.post(f'/api/buckets/{uuid}', json=payload)
        self.assertEqual(response.status_code, 401)
        response = self.client.post(f'/api/buckets/{uuid}', json=payload, headers=headers)
        self.ok(response)

        # List features in the bucket.
        response = self.client.get(f'/api/buckets/{uuid}')
        self.ok(response)
        self.assertEqual(response.json['features'], ['fet1'])

        # Retrieve features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.ok(response)
        self.assertEqual(response.json['json'][fname]['data']['0']['mean'], 42)
        self.assertEqual(response.json['json'][fname]['data']['1']['mean'], 420)

        # Patch features.
        data = {fname: {'data': {0: {'mean': 84}}, 'statistics': {'mean': 48}}}
        payload = {'fname': fname, 'json': data}
        response = self.client.patch(f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.ok(response)

        # Retrieve modified features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(response.json['json'][fname]['data']['0']['mean'], 84)
        # NOTE: the JSON data is completely replaced, keys that were present before but not now
        # are deleted.
        self.assertTrue('1' not in response.json['json'][fname]['data'])

        # Delete the features and check they cannot be retrieved anymore.
        response = self.client.delete(f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(response.status_code, 404)


if __name__ == '__main__':
    # app.run()
    unittest.main()
