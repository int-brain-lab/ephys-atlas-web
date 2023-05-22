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
def get_features_index():
    return response_json_file(FEATURES_DIR / 'index.json')


# -------------------------------------------------------------------------------------------------
# GET /api/features/<uuid>
# -------------------------------------------------------------------------------------------------

@app.route('/api/features/<uuid>', methods=['GET'])
def get_features(uuid):
    # Search for files matching the provided uuid.
    files = FEATURES_DIR.glob(f'*-{uuid}.json')

    # 404 error message
    if not files:
        return response_file_not_found(uuid)

    # Sort the files by date and retrieve the last match.
    sorted_files = sorted(files)
    filename = sorted_files[-1]
    return response_json_file(filename)


if __name__ == '__main__':
    app.run()
