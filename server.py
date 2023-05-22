#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

import datetime
import glob
from pathlib import Path

from flask import Flask, Response, request, jsonify


# -------------------------------------------------------------------------------------------------
# Global variables
# -------------------------------------------------------------------------------------------------

app = Flask(__name__)
ROOT_DIR = Path(__file__).resolve().parent
FEATURES_DIR = ROOT_DIR / 'data/features'


# -------------------------------------------------------------------------------------------------
# Util functions
# -------------------------------------------------------------------------------------------------

def return_file_not_found(path):
    return jsonify(message=f'File not found: {path}'), 404


def return_json_file(path):
    if not path.exists():
        return return_file_not_found(path)
    with open(path, 'r') as f:
        text = f.read()
    return Response(text, headers={'Content-Type': 'application/json'})


# -------------------------------------------------------------------------------------------------
# POST /api/features
# -------------------------------------------------------------------------------------------------

@app.route('/api/features', methods=['POST'])
def save_features():
    # Ensure the features directory exists.
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)

    uuid = request.form.get('uuid')
    assert uuid
    json_data = request.form.get('json')
    assert json_data

    # Get the current date in YYYYMMDD format
    current_date = datetime.datetime.now().strftime('%Y%m%d')

    # Create the filename based on the date and uuid
    filename = f'{current_date}-{uuid}.json'

    # Save the JSON content to the file
    with open(FEATURES_DIR / filename, 'w') as f:
        f.write(json_data)

    return jsonify(message=f'File `{filename}` saved successfully')


# -------------------------------------------------------------------------------------------------
# GET /api/features
# -------------------------------------------------------------------------------------------------

@app.route('/api/features', methods=['GET'])
def get_features():
    return return_json_file(FEATURES_DIR / 'index.json')


# -------------------------------------------------------------------------------------------------
# GET /api/features/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/features/<uuid>', methods=['GET'])
def get_feature(uuid):
    # Search for files matching the provided uuid.
    files = FEATURES_DIR.glob(f'*-{uuid}.json')

    if not files:
        return_file_not_found(uuid)

    # Sort the files by date and retrieve the last match.
    sorted_files = sorted(files)
    filename = sorted_files[-1]
    return return_json_file(filename)


if __name__ == '__main__':
    app.run()
