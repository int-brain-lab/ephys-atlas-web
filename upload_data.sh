#scp data.zip iblviz:/var/www/ibl_website/ephys-atlas-web/
rsync -avzh data/css iblviz:/var/www/ibl_website/ephys-atlas-web/data/
rsync -avzh data/json iblviz:/var/www/ibl_website/ephys-atlas-web/data/
rsync -avzh Build iblviz:/var/www/ibl_website/ephys-atlas-web/
