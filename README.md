# IBL ephys atlas web app

## Running locally


### 1. Install requirements

Only tested on Ubuntu 22.04.

Install:

* A scientific Python distribution
* [svgo](https://github.com/svg/svgo)
* [inkscape](https://inkscape.org/)


```bash
sudo apt-get install npm
sudo npm install --global http-server
```


### 2. Clone the repository

`git clone https://github.com/int-brain-lab/ephys-atlas-web.git`


### 3. Generate the ephys atlas features

You need `ibllib`, `ibleatools`.

Run:

```
python make_ephys.py
```

By default, this script expects the data to be in `../ibleatools/temp/ea_active/2025_W52/agg_full/` and the output is saved in `data/ephys/`.

Then, the features should be uploaded to the atlas backend server.

### 4. Run the static HTTP server

Run `./run.sh` (which just calls `python -m http.server` as this is a severless static web application for now).


## Deployment

- Clone the repository.
- You also need to upload the files listed in section 3.2 above.

Apache configuration file, for example `/etc/apache2/sites-available/atlas.conf`:

```
<VirtualHost *:80>
    ServerAdmin admin@internationalbrainlab.org
    ServerName atlas.internationalbrainlab.org
    DocumentRoot /path/to/ephys-atlas-web
    AddOutputFilterByType DEFLATE application/javascript application/json
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

## Fix CORS issues

You can add this in `/etc/apache2/apache2.conf`:

```
# NOTE: setup CORS policy for all websites
Header set Access-Control-Allow-Origin *
Header set Access-Control-Allow-Methods: "GET, POST, OPTIONS, PUT, DELETE"
Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Content-Encoding"
```

## Serving the flask features server

- Create `/.ibl/globalkey` with `f9134149-fcb5-4142-a0eb-4e76a0811cf9`.
- Apache configuration:

```
<VirtualHost *:443>
    ServerName features.internationalbrainlab.org

    WSGIDaemonProcess features user=ubuntu group=www-data threads=5 python-home=/var/www/ibl_website/atlas2/venv python-path=/var/www/ibl_website/atlas2/
    WSGIScriptAlias / /var/www/ibl_website/atlas2/features.wsgi

    <Directory /var/www/ibl_website/atlas2>
        WSGIProcessGroup features
        WSGIApplicationGroup %{GLOBAL}
        Require all granted
    </Directory>

    # !!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!
    <LocationMatch ".*">
        # necessary if when using token-based authentication, to ensure the Authentication
        # HTTP header is not removed when being passed to django via WSGI
        CGIPassAuth On
    </LocationMatch>

    ErrorLog ${APACHE_LOG_DIR}/error_features.log
    CustomLog ${APACHE_LOG_DIR}/access_features.log combined
</VirtualHost>
```
