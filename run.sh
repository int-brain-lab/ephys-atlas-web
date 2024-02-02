# to generate local https certificate:
# - sudo apt install libnss3-tools
# - mkcert -install
# - mkcert localhost

http-server --cors --gzip -p 8456 -S -C localhost.pem -K localhost-key.pem
