#!/bin/bash
# backend.sh
source .venv/bin/activate
uv pip install -r requirements.txt  # optional if already done
python server.py
