set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    @just --list

frontend:
    command -v http-server >/dev/null 2>&1 || { echo "Missing 'http-server'. Install with: sudo npm install --global http-server"; exit 1; }
    test -f localhost.pem && test -f localhost-key.pem || { echo "Missing localhost TLS certs. Create them with: mkcert -install && mkcert localhost"; exit 1; }
    echo "[FRONTEND] Serving atlas frontend at https://localhost:${PORT:-8456}"
    http-server --cors --gzip -p "${PORT:-8456}" -S -C localhost.pem -K localhost-key.pem

frontend-check:
    command -v http-server >/dev/null 2>&1 || { echo "Missing 'http-server'. Install with: sudo npm install --global http-server"; exit 1; }
    test -f localhost.pem && test -f localhost-key.pem || { echo "Missing localhost TLS certs. Create them with: mkcert -install && mkcert localhost"; exit 1; }
    echo "[FRONTEND] Frontend prerequisites look good (port ${PORT:-8456}, TLS certs present)."

backend:
    command -v uv >/dev/null 2>&1 || { echo "Missing 'uv'. Install it first: https://docs.astral.sh/uv/"; exit 1; }
    test -f .venv/bin/python || { echo "Missing .venv. Run 'just backend-install' first."; exit 1; }
    .venv/bin/python -c "import flask, flask_cors"
    echo "[BACKEND] Serving atlas backend at https://localhost:5000"
    .venv/bin/python server.py

backend-install:
    command -v uv >/dev/null 2>&1 || { echo "Missing 'uv'. Install it first: https://docs.astral.sh/uv/"; exit 1; }
    test -f .venv/bin/python || uv venv .venv
    uv pip install --python .venv/bin/python -r requirements.txt
    .venv/bin/python -c "import flask, flask_cors"
    echo "[BACKEND] Backend environment is ready in .venv"

backend-check:
    command -v uv >/dev/null 2>&1 || { echo "Missing 'uv'. Install it first: https://docs.astral.sh/uv/"; exit 1; }
    test -f .venv/bin/python || { echo "Missing .venv. Run 'just backend-install' first."; exit 1; }
    .venv/bin/python -c "import flask, flask_cors"
    echo "[BACKEND] Backend prerequisites look good (.venv and Flask imports available)."

check: backend-check frontend-check
    echo "[DEV] Frontend and backend prerequisite checks passed."

dev:
    bash -eu -o pipefail -c 'just check; cleanup() { jobs -p | xargs -r kill >/dev/null 2>&1 || true; }; trap cleanup EXIT INT TERM; just backend > >(sed "s/^/[backend] /") 2> >(sed "s/^/[backend] /" >&2) & just frontend > >(sed "s/^/[frontend] /") 2> >(sed "s/^/[frontend] /" >&2) & echo "[DEV] Frontend: https://localhost:${PORT:-8456}"; echo "[DEV] Backend:  https://localhost:5000"; echo "[DEV] Press Ctrl+C to stop both processes."; wait'

test-frontend:
    npm run test:frontend
