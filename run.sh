# to generate local https certificate:
# - sudo apt install mkcert
# - mkcert -install
# - mkcert localhost

http-server -p 8000 -S -C localhost.pem -K localhost-key.pem
