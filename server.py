#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from datetime import datetime, timedelta
from itertools import groupby
from operator import itemgetter
from pathlib import Path
import itertools
import json
import os
import random
import re
import shutil
import ssl
import sys
import unittest
import uuid

import numpy as np
from flask import Flask, Response, request
import requests


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

FEATURES_BASE_URL = "https://atlas2.internationalbrainlab.org/"
FEATURES_API_BASE_URL = "https://features.internationalbrainlab.org/api/"

# DEBUG
DEBUG = False
if DEBUG:
    FEATURES_BASE_URL = 'https://localhost:8456/'
    FEATURES_API_BASE_URL = 'https://localhost:5000/api/'


# -------------------------------------------------------------------------------------------------
# Util functions
# -------------------------------------------------------------------------------------------------

def response_file_not_found(path):
    return f'File not found: {path}', 404


# NOTE: obsolete
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


def delete_old_subfolders(FEATURES_DIR, dry_run=True):
    one_year_ago = datetime.now() - timedelta(days=365)

    for subdir in FEATURES_DIR.iterdir():
        if 'bwm_' in str(subdir) or 'ephys_' in str(subdir):
            continue
        if subdir.is_dir():
            json_file = subdir / '_bucket.json'

            if json_file.exists():
                with open(json_file, 'r') as file:
                    data = json.load(file)
                last_access_date = datetime.fromisoformat(data.get('last_access_date', ''))

                if last_access_date < one_year_ago:
                    print(f"Deleting {subdir} last accessed on {last_access_date}")
                    # Delete the subfolder
                    if not dry_run:
                        subdir.rmdir()


def save_features(path, json_data):
    assert path
    assert json_data
    with open(path, 'w') as f:
        json.dump(json_data, f, indent=1)


# -------------------------------------------------------------------------------------------------
# Bucket metadata
# -------------------------------------------------------------------------------------------------

def multiple_file_types(patterns):
    return itertools.chain.from_iterable(
        FEATURES_DIR.glob(pattern) for pattern in patterns)


def get_bucket_path(uuid):
    """
    NOTE: the bucket directory should contain the uuid but can also contain an alias
    """
    patterns = (f'{uuid}_*', f'*_{uuid}', uuid)
    # filenames = sum(list(FEATURES_DIR.glob(p)) for p in patterns)
    filenames = list(multiple_file_types(patterns))
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
    # assert 'token' in metadata
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
    token = str(uuid.UUID(int=random.getrandbits(128)))
    if max_length:
        token = token[:max_length]
    return token


def new_uuid():
    return new_token(BUCKET_UUID_LENGTH)


def now():
    return datetime.now().isoformat()


def create_bucket_metadata(
        bucket_uuid, alias=None, short_desc=None, long_desc=None, url=None, tree=None):
    return {
        'uuid': bucket_uuid,
        'alias': alias,
        'url': url,
        'tree': tree,
        'short_desc': short_desc,
        'long_desc': long_desc,
        'token': new_token(),
        'last_access_date': now(),
    }


def update_bucket_metadata(uuid, metadata=None):
    metadata_orig = load_bucket_metadata(uuid)
    metadata_orig.update(metadata or {})
    metadata_orig['last_access_date'] = now()
    save_bucket_metadata(uuid, metadata_orig)
    return metadata_orig


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
    # HACK: False means bad authentication, None means the bucket does not exist.

    try:
        passed_token = extract_token()
    except RuntimeError as e:
        # No passed token? Authorization error.
        return False

    expected_token = load_bucket_token(uuid)
    if expected_token:
        return passed_token == expected_token

    # No expected token? Bucket does not exist.
    return None


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
    return str(e), 404


# -------------------------------------------------------------------------------------------------
# Business logic
# -------------------------------------------------------------------------------------------------

def get_feature_metadata(uuid, fname):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path or not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Open the JSON file.
    with open(features_path, 'r') as f:
        metadata = json.load(f)

    return {'short_desc': metadata.get('short_desc', '') or ''}


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

    # Retrieve the feature metadata for all features.
    features = {fname: get_feature_metadata(uuid, fname) for fname in fnames}

    return {'features': features, 'metadata': metadata}


def create_bucket(uuid, metadata, alias=None, patch=False):
    assert uuid
    assert metadata

    if not patch:
        assert 'token' in metadata
        assert metadata['token']

    # Ensure no bucket with the same uuid exists.
    if not patch and isinstance(get_bucket(uuid), dict):
        return f'Bucket {uuid} already exists.', 409

    # Create the bucket directory.
    bucket_dir = FEATURES_DIR / f'{alias or ""}{"_" if alias else ""}{uuid}'
    if not patch:
        assert not bucket_dir.exists()
        bucket_dir.mkdir(parents=True, exist_ok=True)

    # Save the metadata (including the token).
    save_bucket_metadata(uuid, metadata)

    return f'Bucket {uuid} successfully {"created" if not patch else "patched"}.', 200


def create_features(uuid, fname, feature_data, short_desc=None, patch=False):
    assert uuid
    assert fname
    assert feature_data
    assert 'mappings' in feature_data

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
    data = {
        'feature_data': feature_data,
        'short_desc': short_desc,
    }
    save_features(features_path, data)

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
    out = get_bucket(uuid)

    # NOTE: remove the token from the metadata dictionary.
    if 'metadata' in out:
        if 'token' in out['metadata']:
            del out['metadata']['token']

    return out


# -------------------------------------------------------------------------------------------------
# REST endpoint: patch bucket information
# PATCH /api/buckets/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['PATCH'])
def api_patch_bucket(uuid):
    # Check authorization to upload new features.
    auth = authenticate_bucket(uuid)
    if auth is False:
        return 'Unauthorized access.', 401
    elif auth is None:
        return 'Bucket does not exist.', 404

    # Get the parameters passed in the POST request.
    data = request.json
    assert data

    metadata = data['metadata']
    metadata = update_bucket_metadata(uuid, metadata)

    # metadata_old = get_bucket(uuid).get('metadata', {})
    # metadata_old.update(metadata)

    return create_bucket(uuid, metadata, patch=True)


# -------------------------------------------------------------------------------------------------
# REST endpoint: create new features in a bucket
# POST /api/buckets/<uuid> (fname, short_desc, feature_data)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>', methods=['POST'])
def api_post_features(uuid):
    # Check authorization to upload new features.
    auth = authenticate_bucket(uuid)
    if auth is False:
        return 'Unauthorized access.', 401
    elif auth is None:
        return 'Bucket does not exist.', 404
    fname = request.json['fname']
    short_desc = request.json.get('short_desc', None)
    feature_data = request.json['feature_data']
    assert 'mappings' in feature_data
    return create_features(uuid, fname, feature_data, short_desc=short_desc)


# -------------------------------------------------------------------------------------------------
# REST endpoint: retrieve features
# GET /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['GET'])
def api_get_features(uuid, fname):

    # Retrieve the bucket path.
    bucket_path = get_bucket_path(uuid)
    if not bucket_path or not bucket_path.exists():
        return f'Bucket {uuid} does not exist, you need to create it first.', 404

    # Retrieve the features path.
    features_path = bucket_path / f'{fname}.json'
    if not features_path.exists():
        return f'Feature {fname} does not exist in bucket {uuid}, you need to create it first.', 404

    # Update the last_access_date field.
    update_bucket_metadata(uuid)

    # Return the contents of the features file.

    if not features_path.exists():
        return response_file_not_found(features_path)
    with open(features_path, 'r') as f:
        text = f.read()

    # HTTP headers
    headers = {'Content-Type': 'application/json'}

    # Special HTTP header if we want to download the JSON file instead of displaying it.
    download = request.args.get('download', '') or ''
    if download.isdigit():
        download = int(download)
    if download:
        headers['Content-Disposition'] = f'attachment; filename={fname}.json'
    return Response(text, headers=headers)


# -------------------------------------------------------------------------------------------------
# REST endpoint: modify existing features
# PATCH /api/buckets/<uuid>/<fname> (json)
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['PATCH'])
def api_patch_features(uuid, fname):
    # Check authorization to change features.
    auth = authenticate_bucket(uuid)
    if auth is False:
        return 'Unauthorized access.', 401
    elif auth is None:
        return 'Bucket does not exist.', 404
    short_desc = request.json.get('short_desc', None)
    feature_data = request.json['feature_data']
    assert 'mappings' in feature_data
    return create_features(
        uuid, fname, feature_data, short_desc=short_desc, patch=True)


# -------------------------------------------------------------------------------------------------
# REST endpoint: delete features
# DELETE /api/buckets/<uuid>/<fname>
# -------------------------------------------------------------------------------------------------

@app.route('/api/buckets/<uuid>/<fname>', methods=['DELETE'])
def api_delete_features(uuid, fname):
    # Check authorization to change features.
    auth = authenticate_bucket(uuid)
    if auth is False:
        return 'Unauthorized access.', 401
    elif auth is None:
        return 'Bucket does not exist.', 404
    return delete_features(uuid, fname)


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


def remove_leaves(tree, check):
    if isinstance(tree, dict):
        for key, value in list(tree.items()):
            if isinstance(value, dict):
                remove_leaves(value, check)
            else:
                if not check(key, value):
                    print(f"remove tree leaf {value}")
                    del tree[key]
    elif isinstance(tree, list):
        for item in tree:
            remove_leaves(item, check)


def create_ephys_features(patch=False, dry_run=False):
    alias = 'ephys'
    short_desc = 'Ephys atlas'
    tree = None

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket /api/buckets/{alias} ({bucket_uuid})")
        if not dry_run:
            metadata = create_bucket_metadata(
                bucket_uuid, alias=alias, short_desc=short_desc, tree=tree)
            assert 'token' in metadata
            print(create_bucket(bucket_uuid, metadata, alias=alias))

    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']
    print(bucket_uuid)

    # Go through the features and mappings.
    for fname, mappings in groupby(
            sorted(iter_fset_features('ephys'), key=itemgetter(0)), itemgetter(0)):
        print(f'/api/buckets/{alias}/{fname}')
        json_data = {'mappings': {mapping: d for _, mapping, d in mappings}}
        if not dry_run:
            print(create_features(bucket_uuid, fname, json_data, patch=patch))


def create_bwm_features(patch=False, dry_run=False):
    alias = 'bwm'
    short_desc = 'Brain wide map'
    sets = ('block', 'choice', 'feedback', 'stimulus')

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket /api/buckets/{alias} ({bucket_uuid})")
        if not dry_run:
            metadata = create_bucket_metadata(
                bucket_uuid, alias=alias, short_desc=short_desc)
            assert 'token' in metadata
            print(create_bucket(bucket_uuid, metadata, alias=alias))

    # Retrieve the bucket uuid.
    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']

    # Go through the features and mappings and create the features.
    fnames = []
    for set in sets:
        for fname, mappings in groupby(sorted(iter_fset_features(
                f'bwm_{set}'), key=itemgetter(0)), itemgetter(0)):
            fname = f'{set}_{fname}'
            fnames.append(fname)
            print(f'/api/buckets/{alias}/{fname}')
            if not dry_run:
                feature_data = {'mappings': {mapping: d for _, mapping, d in mappings}}
                print(create_features(bucket_uuid, fname, feature_data, patch=patch))

    # Generate the BWM tree.
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

    # Remove tree features that do not exist.
    remove_leaves(tree, lambda _, fname: fname in fnames)

    # Patch the tree.
    if not dry_run:
        # Retrieve the existing bucket metadata.
        metadata = bucket['metadata']
        # Update the tree in the bucket metadata.
        metadata['tree'] = tree
        # Patch the file.
        print(create_bucket(bucket_uuid, metadata, alias=alias, patch=True))


# -------------------------------------------------------------------------------------------------
# Generate custom features for upload
# -------------------------------------------------------------------------------------------------

def new_uuid():
    return new_token(18)


def make_features(acronyms, values, hemisphere=None):
    from tools.mappings import process_data
    return process_data(acronyms, values, hemisphere=hemisphere)
    # assert mapping == 'beryl', "TODO: Other mappings not yet implemented"
    # acronyms = np.asarray(acronyms)
    # # Convert acronyms to atlas ids.
    # from ibllib.atlas.regions import BrainRegions
    # br = BrainRegions()
    # ina = np.in1d(acronyms, br.acronym)
    # if not np.all(ina):
    #     ac = ', '.join(acronyms[np.nonzero(~ina)[0]])
    #     raise ValueError(
    #         f"The following acronyms do not belong to the mapping: {ac}")
    # aids = np.vstack(br.acronym2index(acronyms)[1])[:, 1]
    # assert len(aids) == len(acronyms)

    # Compute the mean.
    # m = np.mean(values)
    #
    # return {
    #     'data': {int(aid): {'mean': float(value)} for aid, value in zip(aids, values)},
    #     'statistics': {
    #         'mean': {
    #             'min': values.min(),
    #             'max': values.max(),
    #             'mean': values.mean(),
    #             'median': np.median(values)
    #         }
    #     },
    # }

def feature_dict(aids, values):
    m = np.mean(values)

    return {
        'data': {int(aid): {'mean': float(value)} for aid, value in zip(aids, values)},
        'statistics': {
            'mean': {
                'min': values.min(),
                'max': values.max(),
                'mean': values.mean(),
                'median': np.median(values)
            }
        },
    }


class FeatureUploader:
    def __init__(self, bucket_uuid, short_desc=None, long_desc=None, tree=None, token=None):
        # Go in user dir and search bucket UUID and token
        # If nothing create new ones and save on disk, and create on the server
        # with post request

        assert bucket_uuid

        self.param_path = Path.home() / '.ibl' / 'custom_features.json'
        self.param_path.parent.mkdir(exist_ok=True, parents=True)
        self.bucket_uuid = bucket_uuid

        # Create the param file if it doesn't exist.
        if not self.param_path.exists():
            self._create_empty_params()
        assert self.param_path.exists()

        # Load the param file.
        self.params = self._load_params()

        # Try loading the token associated to the bucket.
        saved_token = self._load_bucket_token(bucket_uuid)

        # The token can also be passed in the constructor.
        self.token = token or saved_token or new_token()

        # If there is no saved token, we assume the bucket does not exist and we create it.
        if not saved_token:
            print(f"Creating new bucket {bucket_uuid}.")

            # Create the bucket metadata.
            metadata = create_bucket_metadata(
                bucket_uuid, short_desc=short_desc, long_desc=long_desc, tree=tree)

            # Create a new bucket on the server.
            self._create_new_bucket(bucket_uuid, metadata=metadata)

            # Save the token in the param file.
            self._save_bucket_token(bucket_uuid, self.token)

        # Update the bucket metadata.
        elif short_desc or long_desc or tree:
            metadata = {}
            if short_desc:
                metadata['short_desc'] = short_desc
            if long_desc:
                metadata['long_desc'] = long_desc
            if tree:
                metadata['tree'] = tree
            try:
                self._patch_bucket(metadata)
            except RuntimeError as e:
                # HACK: if the patching failed whereas there is a saved token, it means the
                # bucket has been destroyed on the server. We receate it here.
                print(f"Recreating new bucket {bucket_uuid}.")

                # Create the bucket metadata.
                metadata = create_bucket_metadata(
                    bucket_uuid, short_desc=short_desc, long_desc=long_desc, tree=tree)

                # Create a new bucket on the server.
                self._create_new_bucket(bucket_uuid, metadata=metadata)

        assert self.token

    # Internal methods
    # ---------------------------------------------------------------------------------------------

    def _headers(self, token=None):
        return {
            'Authorization': f'Bearer {token or self.token}',
            'Content-Type': 'application/json'
        }

    def _url(self, endpoint):
        if endpoint.startswith('/'):
            endpoint = endpoint[1:]
        return FEATURES_API_BASE_URL + endpoint

    def _post(self, endpoint, data):
        url = self._url(endpoint)
        response = requests.post(url, headers=self._headers(), json=data, verify=not DEBUG)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    def _patch(self, endpoint, data):
        url = self._url(endpoint)
        response = requests.patch(url, headers=self._headers(), json=data, verify=not DEBUG)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    def _get(self, endpoint):
        url = self._url(endpoint)
        response = requests.get(url, verify=not DEBUG)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    # Params
    # ---------------------------------------------------------------------------------------------

    def _create_empty_params(self):
        with open(self.param_path, 'w') as f:
            json.dump({'buckets': {}}, f, indent=1)

    def _load_params(self):
        with open(self.param_path, 'r') as f:
            return json.load(f)

    def _save_params(self, params):
        with open(self.param_path, 'w') as f:
            json.dump(params, f, indent=1)

    # Bucket tocken
    # ---------------------------------------------------------------------------------------------

    def _load_bucket_token(self, bucket_uuid):
        assert self.params
        return self.params.get('buckets', {}).get(
            bucket_uuid, {}).get('token', None)

    def _save_bucket_token(self, bucket_uuid, token):
        params = self.params
        if bucket_uuid not in params['buckets']:
            params['buckets'][bucket_uuid] = {}
        params['buckets'][bucket_uuid]['token'] = token
        self._save_params(params)

    # Global key
    # ---------------------------------------------------------------------------------------------

    def _load_global_key(self):
        assert self.params
        return self.params.get('global_key', None)

    def _save_global_key(self, gk):
        assert self.params
        params = self.params
        params['global_key'] = gk
        self._save_params(params)

    def _prompt_global_key(self):
        return input(
            "Plase copy-paste the global key from the documentation webpage:\n")

    def _get_global_key(self):
        """Global authentication to create new buckets.

        1. If the global key is saved in ~/.ibl/custom_features.json, use it.
        2. Otherwise, prompt it and save it.

        """
        gk = self._load_global_key()
        if not gk:
            gk = self._prompt_global_key()
            self._save_global_key(gk)
        assert gk
        return gk

    # Bucket creation
    # ---------------------------------------------------------------------------------------------

    def _create_new_bucket(self, bucket_uuid, metadata=None):
        # Make a POST request to /api/buckets to create the new bucket.
        # NOTE: need for global key authentication to create a new bucket.
        metadata = metadata or {}
        metadata['token'] = self.token
        data = {'uuid': bucket_uuid, 'metadata': metadata}
        endpoint = f'/buckets'
        url = self._url(endpoint)
        print(url)
        gk = self._get_global_key()
        response = requests.post(url, json=data, headers=self._headers(gk), verify=not DEBUG)
        if response.status_code != 200:
            raise RuntimeError(response.text)

    def _patch_bucket(self, metadata):
        # Make a PATCH request to /api/buckets/<uuid> to update the bucket metadata.
        metadata = metadata or {}
        data = {'metadata': metadata}
        endpoint = f'/buckets/{self.bucket_uuid}'
        response = self._patch(endpoint, data)
        if response.status_code != 200:
            raise RuntimeError(response.text)

    # Public methods
    # ---------------------------------------------------------------------------------------------

    def _post_or_patch_features(
            self, method, fname, acronyms, values, short_desc=None, hemisphere=None):

        assert method in ('post', 'patch')
        assert fname
        # assert mapping
        assert acronyms is not None
        assert values is not None
        assert len(acronyms) == len(values)

        # Prepare the JSON payload.
        data = make_features(acronyms, values, hemisphere=hemisphere)
        # assert 'data' in data
        # assert 'statistics' in data
        payload = {
            'fname': fname,
            'short_desc': short_desc,
            'feature_data': {
                'mappings': {
                    'allen': feature_dict(data['allen']['index'], data['allen']['values']),
                    'beryl': feature_dict(data['beryl']['index'], data['beryl']['values']),
                    'cosmos': feature_dict(data['cosmos']['index'], data['cosmos']['values']),
                }
            }
        }

        # Make a POST request to /api/buckets/<uuid>.
        if method == 'post':
            response = self._post(f'buckets/{self.bucket_uuid}', payload)
        elif method == 'patch':
            response = self._patch(
                f'buckets/{self.bucket_uuid}/{fname}', payload)

    def get_buckets_url(self, uuids):
        assert uuids
        assert isinstance(uuids, list)
        # NOTE: %2C is a comma encoded
        return f'{FEATURES_BASE_URL}?buckets={"%2C".join(uuids)}&bucket={uuids[0]}'

    def patch_bucket(self, **metadata):
        self._patch_bucket(metadata)

    def create_features(self, fname, acronyms, values, hemisphere=None):
        """Create new features in the bucket."""
        self._post_or_patch_features(
            'post', fname, acronyms, values, hemisphere=hemisphere)

    def get_bucket_metadata(self):
        response = self._get(f'buckets/{self.bucket_uuid}')
        return response.json()

    def list_features(self):
        """Return the list of fnames in the bucket."""
        return self.get_bucket_metadata()['features']

    def get_features(self, fname):
        """Retrieve features in the bucket."""
        assert fname
        response = self._get(f'/buckets/{self.bucket_uuid}/{fname}')
        features = response.json()
        return features

    def features_exist(self, fname):
        try:
            self.get_features(fname)
        except RuntimeError as e:
            return False
        return True

    def patch_features(self, fname, acronyms, values, mapping='beryl'):
        """Update existing features in the bucket."""
        self._post_or_patch_features(
            'patch', fname, acronyms, values, mapping=mapping)


# -------------------------------------------------------------------------------------------------
# Tests
# -------------------------------------------------------------------------------------------------

class TestApp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):

        # Bucket authentication token for tests.
        random.seed(785119511684651894)
        cls.token = new_token()

    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def ok(self, response):
        self.assertEqual(response.status_code, 200)

    def test_server(self):
        # Ensure the directory does not exist before running the tests.
        path = FEATURES_DIR / 'myuuid'
        if path.exists():
            shutil.rmtree(path)

        # Bucket metadata.
        alias = 'myalias'
        short_desc = 'mydesc'
        url = 'https://atlas.internationalbrainlab.org'
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
            uuid, alias=alias, short_desc=short_desc, url=url, tree=tree)
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
        self.assertEqual(response.json['features'], {})
        self.assertEqual(response.json['metadata']['alias'], alias)
        self.assertEqual(response.json['metadata']['short_desc'], short_desc)
        self.assertEqual(response.json['metadata']['url'], url)
        self.assertEqual(response.json['metadata']['tree'], tree)
        self.assertFalse('token' in response.json['metadata'])

        # Patch bucket metadata.
        payload = {'metadata': {'tree': {'a': 1}}}
        response = self.client.patch(f'/api/buckets/{uuid}', json=payload, headers=headers)
        self.ok(response)
        response = self.client.get(f'/api/buckets/{uuid}')
        self.ok(response)
        self.assertEqual(response.json['metadata']['url'], url)
        self.assertEqual(response.json['metadata']['short_desc'], short_desc)
        self.assertEqual(response.json['metadata']['tree'], {'a': 1})

        # Create features.
        fname = 'fet1'
        data = {
            'mappings': {
                'beryl': {
                    'data': {
                        0: {'mean': 42},
                        1: {'mean': 420},
                    },
                    'statistics': {
                        'mean': 21
                    }
                }
            },
        }
        short_desc = 'my short description'
        payload = {'fname': fname, 'feature_data': data, 'short_desc': short_desc}
        # NOTE: fail if no authorization header.
        response = self.client.post(f'/api/buckets/{uuid}', json=payload)
        self.assertEqual(response.status_code, 401)
        response = self.client.post(f'/api/buckets/{uuid}', json=payload, headers=headers)
        self.ok(response)

        # List features in the bucket.
        response = self.client.get(f'/api/buckets/{uuid}')
        self.ok(response)
        self.assertEqual(response.json['features'],
                         {'fet1': {'short_desc': 'my short description'}})

        # Retrieve features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.ok(response)
        self.assertEqual(response.json['feature_data']['mappings']
                         ['beryl']['data']['0']['mean'], 42)
        self.assertEqual(response.json['feature_data']['mappings']
                         ['beryl']['data']['1']['mean'], 420)

        # Patch features.
        data = {'mappings': {'beryl': {'data': {0: {'mean': 84}}, 'statistics': {'mean': 48}}}}
        payload = {'fname': fname, 'feature_data': data}
        response = self.client.patch(
            f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.ok(response)

        # Retrieve modified features.
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(
            response.json['feature_data']['mappings']['beryl']['data']['0']['mean'], 84)
        # NOTE: the JSON data is completely replaced, keys that were present before but not now
        # are deleted.
        self.assertTrue('1' not in response.json['feature_data']['mappings']['beryl']['data'])

        # Delete the features and check they cannot be retrieved anymore.
        response = self.client.delete(
            f'/api/buckets/{uuid}/{fname}', json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.get(f'/api/buckets/{uuid}/{fname}')
        self.assertEqual(response.status_code, 404)

        # Delete the bucket path.
        path = get_bucket_path(uuid)
        if path:
            shutil.rmtree(path)

    def test_client(self):
        bucket_uuid = 'myuuid'
        fname = 'newfeatures'

        acronyms = ['CP', 'SUB']
        values = [42, 420]
        tree = {'dir': {'my custom features': fname}}

        # Create or load the bucket.
        up = FeatureUploader(bucket_uuid, tree=tree, token=self.token)

        # Create the features.
        if not up.features_exist(fname):
            up.create_features(fname, acronyms, values)

        # Patch the bucket metadata.
        tree['duplicate features'] = fname
        up.patch_bucket(tree=tree)

        # List all features in the bucket.
        print(up.list_features())

        # Retrieve one feature.
        features = up.get_features(fname)
        print(features)

        # Patch the features.
        values[1] = 10
        up.patch_features(fname, acronyms, values)


# -------------------------------------------------------------------------------------------------
# Script entry-point
# -------------------------------------------------------------------------------------------------

if __name__ == '__main__':

    # Rebuild ephys and BWM buckets
    if sys.argv[-1] == 'make':
        create_ephys_features()
        create_bwm_features()

    # Launch tests
    elif sys.argv[-1] == 'test':
        test_suite = unittest.TestLoader().loadTestsFromTestCase(TestApp)
        test_runner = unittest.TextTestRunner()
        test_runner.run(test_suite)

    # Example.
    elif sys.argv[-1] == 'example':

        from ibllib.atlas.regions import BrainRegions
        br = BrainRegions()

        n = 300
        mapping = 'beryl'
        fname1 = 'fet1'
        fname2 = 'fet2'
        bucket = 'mybucket'
        tree = {'dir': {'custom features 1': fname1}, 'custom features 2': fname2}

        # Beryl regions.
        acronyms = np.unique(br.acronym[br.mappings[mapping.title()]])[:n]
        n = len(acronyms)
        values1 = np.random.randn(n)
        values2 = np.random.randn(n)
        assert len(acronyms) == len(values1)
        assert len(acronyms) == len(values2)

        # Create or load the bucket.
        up = FeatureUploader(bucket, tree=tree)

        # Create the features.
        if not up.features_exist(fname1):
            up.create_features(fname1, acronyms, values1, mapping=mapping)
        if not up.features_exist(fname2):
            up.create_features(fname2, acronyms, values2, mapping=mapping)

        url = up.get_buckets_url([bucket])
        print(url)

    # Run server
    else:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain('localhost.pem', 'localhost-key.pem')
        app.run(ssl_context=context, debug=True)
