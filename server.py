#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

import datetime
import os
from pathlib import Path
import re

from flask import Flask, Response, request, jsonify


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

app = Flask(__name__)
ROOT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = ROOT_DIR / 'data/features'
FEATURES_FILE_REGEX = re.compile(r'^\d{8}-\S+\.json$')
DELETE_AFTER_DAYS = 180
NATIVE_FNAMES = ('ephys', 'bwm_block', 'bwm_choice',
                 'bwm_feedback', 'bwm_stimulus')


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
    json_data = request.form.get('json')
    assert json_data
    with open(path, 'w') as f:
        f.write(json_data)


# -------------------------------------------------------------------------------------------------
# Authorization
# -------------------------------------------------------------------------------------------------

def extract_token():
    # Check if the Authorization header is present
    if 'Authorization' not in request.headers:
        return 'Unauthorized', 401

    # Extract the token from the Authorization header
    auth_header = request.headers.get('Authorization')
    auth_type, token = auth_header.split(' ')
    assert token
    return token.strip().lower()


def get_bucket_path(uuid):
    return FEATURES_DIR.glob(f'{uuid}*/token')[0]


def save_bucket_token(uuid, token):
    with open(get_bucket_path(uuid), 'w') as f:
        f.write(token)


def load_bucket_token(uuid):
    with open(get_bucket_path(uuid), 'r') as f:
        token = f.read().strip().lower()
    assert token
    return token


def authenticate_bucket(uuid):
    passed_token = extract_token()
    expected_token = load_bucket_token(uuid)
    return passed_token == expected_token


# -------------------------------------------------------------------------------------------------
# POST /api/buckets
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets', methods=['POST'])
def create_bucket():
    # Get the parameters passed in the POST request.
    uuid = request.form.get('uuid')
    assert uuid

    token = request.form.get('token')
    assert token

    # Create the bucket directory.
    bucket_dir = FEATURES_DIR / uuid
    if bucket_dir.exists():
        return 'Bucket already exists', 409
    bucket_dir.mkdir(parents=True, exist_ok=True)

    # Save the token.
    (bucket_dir / 'token').write_text(token)

    return jsonify({'message', f'Bucket {uuid} successfully created.'})


# -------------------------------------------------------------------------------------------------
# GET /api/buckets/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['GET'])
def get_bucket_index(uuid):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first', 404

    # Retrieve the list of JSON files in the bucket directory.
    fnames = bucket_path.glob('*.json')
    fnames = sorted(_.name for _ in fnames)
    return jsonify({'fnames': fnames})


# -------------------------------------------------------------------------------------------------
# POST /api/buckets/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['POST'])
def post_features(uuid):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first', 404

    # Retrieve the features path.
    fname = request.form.get('fname')
    features_path = bucket_path / f'{fname}.json'
    if features_path.exists():
        return f'Feature {fname} already exists', 409

    # Save the features.
    save_features(features_path)

    return jsonify({'message', f'Feature {fname} successfully created in bucket {uuid}.'})


# -------------------------------------------------------------------------------------------------
# GET /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['GET'])
def get_features(uuid, fname):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first', 404

    # Return the contents of the features file.
    return response_json_file(features_path)


# -------------------------------------------------------------------------------------------------
# PATCH /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['PATCH'])
def patch_features(uuid, fname):
    # Check authorization to change features.
    if not authenticate_bucket(uuid):
        return 'Unauthorized', 401

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first', 404

    # Save the features.
    save_features(features_path)

    return jsonify({'message', f'Feature {fname} successfully created in bucket {uuid}.'})


if __name__ == '__main__':
    app.run()
