from pathlib import Path

import numpy as np
import pandas as pd

from ibllib.atlas import AllenAtlas
import ephys_atlas.data
from one.api import ONE

from server import write_npy_gz


one = ONE(mode='local')
local_path = Path('.')
label = '2023_W34'
df_voltage, df_clusters, df_channels, df_probes = ephys_atlas.data.download_tables(
    local_path, label=label, one=one, verify=True)

sc = df_voltage['spike_count']
x = df_channels['x']
y = df_channels['y']
z = df_channels['z']

df = pd.DataFrame({'sc': sc, 'x': x, 'y': y, 'z': z})
pos = np.c_[df.x, df.y, df.z]
value = df.sc

a = AllenAtlas()
i, j, k = a.bc.xyz2i(pos, mode='clip').T
# is :          456, 528, 320

volume = np.zeros((528, 320, 456), dtype=np.uint8)
a, b, c = volume.shape
m = np.quantile(value[~np.isnan(value)], .95)
value_8 = np.clip(255 * value.values / m, 0, 255).astype(np.uint8)
for u in (-1, 0, +1):
    for v in (-1, 0, +1):
        for w in (-1, 0, +1):
            volume[np.clip(j + u, 0, a - 1),
                   np.clip(k + v, 0, b - 1),
                   np.clip(i + w, 0, c - 1)] = value_8

path = "data/features/mybucket/gaelle.npy.gz"
write_npy_gz(path, volume, extra=(0, m))

# np.save("data/features/mybucket/gaelle.npy", volume)

# should be:    528, 320, 456

# idx = np.transpose(idx, (1, 2, 0))
# print(idx.shape)
