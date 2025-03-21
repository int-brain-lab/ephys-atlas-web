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


### 3. Get the data

You can either obtain the generated data directly, or generate it from the input data.

#### 3.1. Generate the data from input files

Get the following files from Cyrille and put them here:

```
data/pqt/allen_regions.pqt
data/pqt/beryl_regions.pqt
data/pqt/cosmos_regions.pqt
data/pqt/features_for_viz_mappings.pqt
```

Then, run `python tools/process.py`.

#### 3.2. Alternatively, obtain the data directly

These files are generated by the `tools/process.py` script. If you obtain these files and put them at their expected location, you don't have to run `tools/process.py`.

```
* data/json/colormaps.json          the colormaps
* data/json/features_<fset>.json    all features for all supported mappings (fset=ephys, ...)
* data/json/regions.json            names of the brain regions
* data/json/slices.json             all SVG data, 84M (~30MB compressed) loaded once at initial startup
* data/css/region_colors.css        default brain region colors
```


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
