#scp data.zip iblviz:/var/www/ibl_website/ephys-atlas-web/
#rsync -avzh data/css iblviz:/var/www/ibl_website/ephys-atlas-web/data/
#rsync -avzh data/json iblviz:/var/www/ibl_website/ephys-atlas-web/data/
rsync -avzh iblviz:/var/www/ibl_website/ephys-atlas-web/Build .
rsync -avzh iblviz:/var/www/ibl_website/ephys-atlas-web/StreamingAssets .
