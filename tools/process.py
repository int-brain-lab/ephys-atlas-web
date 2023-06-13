#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

import base64
import gzip
import json
import os
import re
import uuid
from datetime import datetime, timezone
from math import isnan
from pathlib import Path
from textwrap import dedent
from xml.dom import minidom

import matplotlib as mpl
import numpy as np
import pandas as pd
import requests
from ibllib.atlas.regions import BrainRegions
from joblib import Parallel, delayed
# from matplotlib import cm
from matplotlib.colors import LinearSegmentedColormap, ListedColormap, to_hex
from pandas.core.groupby import DataFrameGroupBy
from tqdm import tqdm


# -------------------------------------------------------------------------------------------------
# Instructions
# -------------------------------------------------------------------------------------------------

"""
Steps to cleanup the SVGs:

1. Start from the original mesh files
2. Run a MATLAB script written by Nick Steinmetz to get slice SVGs.
3. Apply Ramer-Douglas-Peucker Algorithm algorithm https://rdp.readthedocs.io/en/latest/ on all
   SVGs.
4. Apply inkscape simplification with parallel processing below (slow), with simplification
   parameter .0007 (in inkscape settings)
5. Apply svgo independently on each file (and not in batch as svgo silently deletes all files!)
6. Apply a simple regex in Python to remove all useless path ID (but keep the <g> region IDs)
7. Some SVG Python processing to cleanup the SVGs further.
8. Create the slices.json file that will be used to fill the IndexedDB database on the client.
"""


# -------------------------------------------------------------------------------------------------
# Constants
# -------------------------------------------------------------------------------------------------

ROOT_DIR = Path(__file__).parent.parent
COLORMAPS = ('viridis', 'cividis', 'magma',
             'YlGn', 'YlOrRd', 'Reds', 'Purples')
COLORMAP_VALUE_COUNT = 100  # number of different values for the colormap
DATA_DIR = ROOT_DIR / "data"
AXES = ('coronal', 'horizontal', 'sagittal')
MAPPINGS = ('allen', 'beryl', 'cosmos')
NS = "http://www.w3.org/2000/svg"
SIMPLIFY_CMD = "inkscape --batch-process --actions='EditSelectAll;SelectionSimplify;FileSave;FileClose'"
RE_PATH = re.compile(r'<path id="path[0-9]+"')
RE_WHITESPACE = re.compile(r'\s+(?=<)')
STYLE = "* { stroke-linecap: butt; stroke-linejoin: round; fill: white; stroke: black; }"
ROOT_ID = 997  # skip the root to avoid bug with lateralization
BWM_FSETS = ('block', 'choice', 'feedback', 'stimulus')
BWM_FNAMES = (
    'decoding',
    'single_cell',
    'manifold',
)
BWM_EXTRA_FNAMES = (
    'euclidean_effect',
    'euclidean_latency',
    'euclidean_significant',

    'glm_effect',

    'mannwhitney_effect',
    'mannwhitney_significant',

    'decoding_effect',
    'decoding_frac_significant',
    'decoding_significant',
)

FEATURES_API_BASE_URL = 'https://ephysatlas.internationalbrainlab.org/api/'

# DEBUG
FEATURES_API_BASE_URL = 'http://127.0.0.1:5000/api/'


# -------------------------------------------------------------------------------------------------
# Utils
# -------------------------------------------------------------------------------------------------

def get_day(file):
    stat = os.stat(file)
    date = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
    return date.day


def float_json(x):
    return float(f'{x:.6g}') if not isnan(x) else None


def save_json(d, filename):
    with open(filename, "w") as f:
        json.dump(d, f, indent=1, sort_keys=True)


def base64_encode(input_string):
    encoded_bytes = base64.b64encode(input_string.encode('utf-8'))
    encoded_string = encoded_bytes.decode('utf-8')
    return encoded_string


def base64_decode(encoded_string):
    decoded_bytes = base64.b64decode(encoded_string.encode('utf-8'))
    decoded_string = decoded_bytes.decode('utf-8')
    return decoded_string


def gzip_compress(input_string):
    compressed_bytes = gzip.compress(input_string.encode('utf-8'))
    encoded_bytes = base64.b64encode(compressed_bytes)
    encoded_string = encoded_bytes.decode('utf-8')
    return encoded_string


def gzip_decompress(compressed_string):
    decoded_bytes = base64.b64decode(compressed_string.encode('utf-8'))
    decompressed_bytes = gzip.decompress(decoded_bytes)
    original_string = decompressed_bytes.decode('utf-8')
    return original_string


def searchunsorted(arr, search):
    sidx = np.argsort(arr)
    return np.searchsorted(arr, search, sorter=sidx)


def acronym2idx(br, mapping, my_acronyms):
    region_idxs = np.unique(br.mappings[mapping])
    region_acronyms = br.acronym[region_idxs]
    return region_idxs[searchunsorted(region_acronyms, my_acronyms)]


def encode_numpy_array(arr):
    arr_bytes = arr.tobytes()
    encoded_bytes = base64.b64encode(arr_bytes)
    return encoded_bytes.decode('utf-8')


def decode_numpy_array(encoded_str, dtype):
    encoded_bytes_str = encoded_str.encode('utf-8')
    encoded_bytes = base64.b64decode(encoded_bytes_str)
    arr = np.frombuffer(encoded_bytes, dtype=dtype)
    return arr


def write_text(s, filename):
    with open(filename, "w") as f:
        f.write(s)


def run_parallel(dir, func):
    files = sorted(dir.iterdir())
    Parallel(n_jobs=-2)(delayed(func)(file) for file in files)


def run_serial(dir, func):
    files = sorted(dir.iterdir())
    for file in files:
        func(file)


def lateralize_features(df):
    for c in df.columns:
        if c.startswith('atlas_id'):
            df[c] = -df[c].abs()
    return df


def get_stats(v):
    return {
        'mean': float_json(np.mean(v)),
        'median': float_json(np.median(v)),
        'std': float_json(np.std(v)),
        'min': float_json(np.min(v)),
        'max': float_json(np.max(v)),
    }


# -------------------------------------------------------------------------------------------------
# Colormaps
# -------------------------------------------------------------------------------------------------

def generate_colormaps():
    out = {}
    for name in COLORMAPS:
        cmap = mpl.colormaps[name]
        colors = cmap(np.linspace(0, 1, COLORMAP_VALUE_COUNT))[:, :3]
        out[name] = [to_hex(c) for c in colors]

    print("Generating colormaps.json...")
    save_json(out, DATA_DIR / 'json/colormaps.json')


# -------------------------------------------------------------------------------------------------
# SVG manipulation functions
# -------------------------------------------------------------------------------------------------

def get_id(element):
    return element.getAttribute('id')


def get_element(root, name, id=None):
    for path in root.getElementsByTagName(name):
        if not id:
            return path
        if get_id(path) == id:
            return path


def yield_elements(root, name, id_start):
    for path in root.getElementsByTagName(name):
        if get_id(path).startswith(id_start):
            yield path


def remove_element(node):
    if not node:
        return
    parent = node.parentNode
    parent.removeChild(node)


def replace_text(node, new_text):
    if node.firstChild.nodeType != node.TEXT_NODE:
        raise Exception("node does not contain text")
    node.firstChild.replaceWholeText(new_text)


def get_xml(root):
    xml = root.toxml()
    xml = RE_WHITESPACE.sub('', xml)
    return xml


def save_xml(root, filename):
    xml = get_xml(root)
    with open(filename, 'w') as f:
        f.write(xml)


# -------------------------------------------------------------------------------------------------
# SVG processing functions
# -------------------------------------------------------------------------------------------------

def simplify(file):
    # step 4
    os.system(f"{SIMPLIFY_CMD} {file}")


def svgo(file):
    # step 5
    os.system(f"svgo {file}")


def remove_path_id(file):
    # step 6
    file.write_text(RE_PATH.sub('<path', file.read_text()))


def clean_svg(file):
    # step 7
    with open(file, 'r') as f:
        root = minidom.parse(f)

        parent = get_element(root, "g", "figure_1")
        assert parent

        # Ungroup the paths by removing the <g> elements .
        for g in yield_elements(root, "g", "region_"):
            p = g.getElementsByTagName("path")[0]
            p.setAttribute("id", get_id(g))
            parent.appendChild(p)
            remove_element(g)

        # Remove some elements.
        remove_element(get_element(root, "defs", "defs250"))
        remove_element(get_element(root, "g", "axes_1"))
        remove_element(get_element(root, "g", "patch_1"))

        # Update the style element.
        style = get_element(root, "style")
        replace_text(style, STYLE)

    # Export to XML
    save_xml(root, file)


def get_figure_string(file):
    # NOTE: this function is obsolete now that the SVG files have been integrated in the slices.json file
    return
    with open(file, 'r') as f:
        root = minidom.parse(f)
        figure = get_element(root, "g", "figure_1")
        out = get_xml(figure)
        out = out.replace('<g id="figure_1">', '')
        out = out.replace('<g id="figure_1"/>', '')
        out = out.replace('</g>', '')
        out = out.replace('id="region_', 'class="region_')
        return out


def make_slices_json(dir):
    # NOTE: this function is obsolete now, further processing has been done by Mayo on slices.json.
    # If this function is to be reused, these extra steps need to be redone.
    return
    # step 8
    svg_files = sorted(dir.iterdir())
    out = {axis: [] for axis in AXES}
    for file in tqdm(svg_files):
        ax, idx = file.stem.split('_')
        idx = int(idx)
        # NOTE: only keep even indexes as we don't need full resolution on the client
        if idx % 2 == 1:
            continue
        assert ax in AXES
        svg = get_figure_string(file)
        if svg:
            out[ax].append({"idx": int(idx), "svg": svg})

    out['top'] = get_figure_string(dir / "../top.svg")
    out['swanson'] = get_figure_string(dir / "../swanson.svg")

    save_json(out, DATA_DIR / "slices.json")


def run_single(file):
    # 3. Apply Ramer-Douglas-Peucker Algorithm algorithm https://rdp.readthedocs.io/en/latest/ on all
    #    SVGs.
    # NOTE: assumed already done

    # 4. Apply inkscape simplification with parallel processing below (slow), with simplification
    #    parameter .0007 (in inkscape settings)
    simplify(file)

    # 5. Apply svgo independently on each file (and not in batch as svgo silently deletes all files!)
    svgo(file)

    # 6. Apply a simple regex in Python to remove all useless path ID (but keep the <g> region IDs)
    remove_path_id(file)

    # 7. Some SVG Python processing to cleanup the SVGs further.
    clean_svg(file)

    # 8. Create the slices.json file that will be used to fill the IndexedDB database on the client.
    # make_slices_json(file)


def run_all(path):
    # Step 4.
    run_parallel(path, simplify)

    # Step 5.
    run_parallel(path, svgo)

    # Step 6.
    run_parallel(path, remove_path_id)

    # Step 7.
    run_parallel(path, clean_svg)

    # Step 8.
    make_slices_json(path)

# -------------------------------------------------------------------------------------------------
# Slice processing
# -------------------------------------------------------------------------------------------------


def process_slices():
    pass
    # for axis in ('coronal', 'horizontal', 'sagittal', 'swanson', 'top'):
    #     with open(DATA_DIR / f'json/slices_{axis}.json', 'r') as f:
    #         slices = json.load(f)
    #     slices = slices[axis]
    #     with open(DATA_DIR / f'json/slices_{axis}.json', 'w') as f:
    #         json.dump(slices, f, indent=1, sort_keys=True)


# -------------------------------------------------------------------------------------------------
# Region processing
# -------------------------------------------------------------------------------------------------

def get_mappings():
    # open the pqt files and return a mappings dictionary
    # {mapping_name: [{idx: ..., atlas_id: ..., acronym: ..., name: ..., hex: ...}]}
    out = {}
    for mapping in MAPPINGS:
        regions = pd.read_parquet(DATA_DIR / f'pqt/{mapping}_regions.pqt')
        out[mapping] = {
            abs(idx_): {
                'atlas_id': atlas_id_,
                'acronym': acronym_,
                'name': name_,
                'hex': hex_,
            }
            for idx_, atlas_id_, acronym_, name_, hex_ in zip(
                regions['idx'], regions['atlas_id'], regions['acronym'],
                regions['atlas_name'], regions['hex'])
        }
        # out[mapping] = sorted(out[mapping], key=itemgetter('idx'))
    return out


# mappings is a dictionary {mapping_name: [{idx, atlas_id, acronym, name, hex}]}
def generate_regions_json(mappings):
    print("Generating regions.json...")
    filename = DATA_DIR / 'json/regions.json'
    save_json(mappings, filename)


def generate_default_regions_css(mappings, mapping):
    print(f"Generating default region colors for mapping {mapping}")
    css = f'/* default SVG path background color for mapping {mapping} */\n'
    css = ''.join(
        dedent(f'''
        svg path.{mapping}_region_{idx} {{ fill: var(--region-{mapping}-{idx}); /* {r['acronym']} */ }}''') for idx, r in mappings[mapping].items())
    css += '\n\n'
    write_text(css, DATA_DIR / f'css/default_region_colors_{mapping}.css')


def generate_regions_css(mappings):
    print("Generating region_colors.css")

    # Default region colors.
    for mapping in MAPPINGS:
        generate_default_regions_css(mappings, mapping)

    css = ''
    for mapping, regions in mappings.items():

        colors = '\n'.join(
            f'''    --region-{mapping}-{idx}: {r['hex']}; /* {r['acronym']} */ '''
            for idx, r in regions.items())
        css += f'/* Mapping {mapping}: default region colors */\n\n:root {{\n\n{colors}\n\n}}\n'

        css += ''.join(
            dedent(f'''
            /* {r['acronym']} */
            #bar-plot-container li.{mapping}_region_{idx} .bar {{ background-color: var(--region-{mapping}-{idx}); }}
            #bar-plot-container li.{mapping}_region_{idx} .acronym {{ color: var(--region-{mapping}-{idx}); }}
            ''') for idx, r in regions.items())

        css += '\n\n'
    write_text(css, DATA_DIR / 'css/region_colors.css')


def get_feature_names(df):
    return [c for c in df.columns
            if (not c.startswith('atlas_id') and
                not c.startswith('acronym') and
                not c.startswith('pid'))]


def get_aggregates(df):
    return {
        'mean': df.mean(numeric_only=True),
        'median': df.median(numeric_only=True),
        # NOTE: if ddof is not set to 0, will return NaN if only 1 element in the groupby DF...
        'std': df.std(ddof=0, numeric_only=True),
        'min': df.min(),
        'max': df.max(),
    }


# features dictionary:
# {mapping: {fet: {data: {atlas_id: {stat: value}}}, statistics: {stat: {mean: value, std: value...}}}}}

def generate_features_groupedby(br, mapping, df, feature_names):
    print(f"Generating features for mapping {mapping}")
    assert isinstance(df, DataFrameGroupBy)
    dfs = get_aggregates(df)

    # Keep the atlas_ids appearing in the groupby dataframe.
    br.keep(mapping, dfs['mean'].index)
    regions = br.get_regions(mapping)

    features = {
        fet: {
            'data': {},
            'statistics': {},
        } for fet in feature_names
    }

    for fet in feature_names:
        # Collect feature values.
        for regionIdx, region in regions.items():
            atlas_id = region['atlas_id']
            d = {}  # stat: value
            for stat, dfg in dfs.items():
                if dfg is None:
                    continue
                v = dfg.loc[atlas_id][fet]
                d[stat] = float_json(v) if ~np.isnan(v) else None
            if d:
                features[fet]['data'][regionIdx] = d

        # Collect statistics across regions, for each feature. Used for bar plot.
        for stat, dfg in dfs.items():
            features[fet]['statistics'][stat] = get_stats(dfg[fet])

    return features


class FeatureBrainRegions:
    def __init__(self):
        self.mappings = get_mappings()

        # for each mapping a dictionary atlas_id => idx
        self.atlas_id_map = {
            mapping: {
                r['atlas_id']: idx
                for idx, r in regions.items()
            } for mapping, regions in self.mappings.items()
        }

        # for each mapping, the list of region idx of regions to keep, or None if all are kept
        self.kept = {mapping: None for mapping in MAPPINGS}

    def keep(self, mapping, atlas_ids):
        # for a given mapping, take a pandas Series with a bunch of atlas_ids, and
        # will save the occurring regions to only keep those.
        self.kept[mapping] = set(self.atlas_id_map[mapping][atlas_id]
                                 for atlas_id in atlas_ids if abs(atlas_id) != ROOT_ID)

    def get_regions(self, mapping):
        # return the kept brain regions
        return {idx: r for idx, r in self.mappings[mapping].items() if idx in self.kept[mapping]}


# -------------------------------------------------------------------------------------------------
# Feature processing
# -------------------------------------------------------------------------------------------------

def generate_ephys_features():
    # Load features.
    df_sessions = pd.read_parquet(
        DATA_DIR / 'pqt/features_for_viz_mappings.pqt')

    # Lateralize the sessions DataFrame.
    df_sessions = lateralize_features(df_sessions)
    feature_names = get_feature_names(df_sessions)

    br = FeatureBrainRegions()

    # Aggregate by region, for each mapping. We use the atlas_id_X where X is the first letter
    # of the mapping.
    out = {}
    for mapping in MAPPINGS:
        df = df_sessions.groupby(f'atlas_id_{mapping[0]}')
        features = generate_features_groupedby(
            br, mapping, df, feature_names)
        out[mapping] = features

    save_json(out, DATA_DIR / f"json/features_ephys.json")


def generate_bwm_features():
    # NOTE: only Beryl is supported for the BWM features
    mapping = 'beryl'

    # Initial features (column name is fset_fname).
    df_sessions = pd.read_parquet(DATA_DIR / 'pqt/bwm_features.pqt')

    # Rename reward into feedback.
    df_sessions = df_sessions.rename(
        columns={
            'reward_decoding': 'feedback_decoding',
            'reward_single_cell': 'feedback_single_cell',
            'reward_manifold': 'feedback_manifold',
        })

    # Extra features (column name is fname).
    df_block = pd.read_parquet(DATA_DIR / 'pqt/bwm_block.pqt')
    df_choice = pd.read_parquet(DATA_DIR / 'pqt/bwm_choice.pqt')
    df_feedback = pd.read_parquet(DATA_DIR / 'pqt/bwm_feedback.pqt')
    df_stimulus = pd.read_parquet(DATA_DIR / 'pqt/bwm_stimulus.pqt')

    # Put the data for decoding, single_cell, manifold in the separate DataFrames
    for fn in BWM_FNAMES:
        df_block[fn] = df_sessions[f'block_{fn}']
        df_choice[fn] = df_sessions[f'choice_{fn}']
        df_feedback[fn] = df_sessions[f'feedback_{fn}']
        df_stimulus[fn] = df_sessions[f'stimulus_{fn}']

    # Detect boolean columns.
    def _debooleanize(df):
        for column in df.columns:
            if set(df[column].unique()) <= set([True, False]):
                df.loc[df[column] == True, (column,)] = 1.0
                df.loc[df[column] == False, (column,)] = 0.5

                # IMPORTANT: otherwise the column will be treated as an object dtype and will be
                # silently deleted by groupby()!
                df[column] = df[column].astype(np.float64)

        return df

    df_block = _debooleanize(df_block)
    df_choice = _debooleanize(df_choice)
    df_feedback = _debooleanize(df_feedback)
    df_stimulus = _debooleanize(df_stimulus)

    for fset in BWM_FSETS:
        df = locals()[f'df_{fset}']

        # Lateralize the sessions DataFrame.
        df = lateralize_features(df)
        feature_names = get_feature_names(df)

        br = FeatureBrainRegions()

        # Aggregate by region, for each mapping. We use the atlas_id_X where X is the first letter
        # of the mapping.
        dfg = df.groupby(f'atlas_id_{mapping[0]}')
        features = generate_features_groupedby(br, mapping, dfg, feature_names)
        out = {mapping: features}
        save_json(out, DATA_DIR / f"json/features_bwm_{fset}.json")


# -------------------------------------------------------------------------------------------------
# Custom features
# NOTE: OBSOLETE, this was to encode custom features directly in the query string, but browsers
# do not support query strings that long.
# -------------------------------------------------------------------------------------------------

class FeatureGenerator:
    def __init__(self, fset='', mapping='Beryl'):
        assert fset
        mapping = mapping.title()
        self.br = BrainRegions()
        self.fset = fset
        self.mapping = mapping
        self.values = {}  # mapping (name, stat) => values
        self.idx = None

    def set_acronyms(self, acronyms):
        self.idx = acronym2idx(
            self.br, self.mapping, acronyms).astype(np.int32)
        assert self.idx.ndim == 1

    def add_values(self, name, values, stat='mean'):
        if self.idx is None:
            raise ValueError(
                f'you need to call set_acronyms(region_acronyms) first')
        if len(values) != len(self.idx):
            raise ValueError(
                f'values should have {len(self.idx)} values, not {len(values)}')
        self.values[(name, stat)] = np.asarray(values, np.float32)

    def compress(self, s):
        # TODO: option for gzip_compress()
        return s

    def decompress(self, s):
        return s

    def encode(self):
        assert self.idx is not None
        assert len(self.values) > 0
        obj = {
            'fset': self.fset,
            'mapping': self.mapping,
            'region_idx': encode_numpy_array(self.idx),
            'features': [],
            'statistics': {},
        }
        for (name, stat), values in self.values.items():
            stats = {}
            stats['mean'] = float(values.mean())
            stats['median'] = float(np.median(values))
            stats['min'] = float(values.min())
            stats['max'] = float(values.max())
            stats['std'] = float(values.std())
            obj['features'].append(
                (name, stat, encode_numpy_array(values), stats))
        return base64_encode(self.compress(json.dumps(obj)))

    def decode(self, s):
        obj = json.loads(self.decompress(base64_decode(s)))
        assert obj['mapping'] == self.mapping
        assert obj['fset'] == self.fset

        # Set the list of regions.
        self.idx = decode_numpy_array(obj['region_idx'], np.int32)

        for name, stat, b64_data, statistics in obj['features']:
            values = decode_numpy_array(b64_data, np.float32)
            self.add_values(name, values, stat=stat)

    def __repr__(self):
        return f'<FeatureGenerator {self.mapping=} with {len(self.values)} set(s) of {self.idx.size} values>'


def generate_custom_features():
    mapping = 'allen'

    fg = FeatureGenerator('custom', mapping)
    br = fg.br

    acronyms = np.unique(br.acronym[br.mappings[mapping]])
    values1 = np.random.randn(acronyms.size)
    values2 = np.random.randn(acronyms.size)

    fg.set_acronyms(acronyms)
    fg.add_values("fname1", values1)
    fg.add_values("fname2", values2)
    s = fg.encode()
    with open('custom_features', 'w') as f:
        f.write(s)
    fg.decode(s)


# -------------------------------------------------------------------------------------------------
# Generate custom features for upload
# -------------------------------------------------------------------------------------------------

def new_token():
    return str(uuid.uuid4())


def make_features(fname, acronyms, values, mapping='beryl'):
    acronyms = np.asarray(acronyms)
    # Convert acronyms to atlas ids.
    br = BrainRegions()
    ina = np.in1d(acronyms, br.acronym)
    if not np.all(ina):
        ac = ', '.join(acronyms[np.nonzero(~ina)[0]])
        raise ValueError(f"The following acronyms do not belong to allen mapping: {ac}")
    aids = br.acronym2index(acronyms, mapping=mapping.title())[1][0]
    assert len(aids) == len(acronyms)

    # Compute the mean.
    m = np.mean(values)

    return {
        fname: {
            'data': {int(aid): {'mean': float(value)} for aid, value in zip(aids, values)},
            'statistics': {'mean': m},
        }
    }


GLOBAL_KEY_PATH = Path('~/.ibl/globalkey').expanduser()

def normalize_token(token):
    return token.strip().lower()


def read_global_key():
    if not GLOBAL_KEY_PATH.exists():
        raise RuntimeError(f"File {GLOBAL_KEY_PATH} does not exist.")
    with open(GLOBAL_KEY_PATH, 'r') as f:
        return normalize_token(f.read())


class FeatureUploader:
    def __init__(self, bucket_uuid):
        # Go in user dir and search bucket UUID and token
        # If nothing create new ones and save on disk, and create on the server with post request

        assert bucket_uuid

        self.param_path = Path.home() / '.ibl' / 'custom_features.json'
        self.param_path.parent.mkdir(exist_ok=True, parents=True)
        self.bucket_uuid = bucket_uuid

        # Create the param file if it doesn't exist.
        if not self.param_path.exists():
            with open(self.param_path, 'w') as f:
                json.dump({'buckets': {}}, f, indent=1)
        assert self.param_path.exists()

        # Load the param file.
        with open(self.param_path, 'r') as f:
            params = json.load(f)

        # Try loading the token associated to the bucket.
        self.token = params.get('buckets', {}).get(bucket_uuid, {}).get('token', None)

        # If there is none, generate a new token, and create the bucket on the server.
        if not self.token:
            print(f"Creating new bucket {bucket_uuid}.")

            # Create a new authorization token.
            self.token = new_token()

            # Make a POST request to /api/buckets/<uuid> to create the new bucket.
            # NOTE: need for global key authentication to create a new bucket.
            data = {'uuid': bucket_uuid, 'metadata': {'token':self.token}}
            endpoint = f'/buckets'
            url = self._url(endpoint)
            gk = read_global_key()
            assert gk
            response = requests.post(url, json=data, headers=self._headers(gk))
            if response.status_code != 200:
                raise RuntimeError(response.text)

            # Save the token in the param file.
            with open(self.param_path, 'w') as file:
                if bucket_uuid not in params['buckets']:
                    params['buckets'][bucket_uuid] = {'token': self.token}
                json.dump(params, file, indent=1)

        assert self.token

    # Internal methods
    # ---------------------------------------------------------------------------------------------

    def _headers(self, token=None):
        return {
            'Authorization': f'Bearer {token or self.token}',
            'Content-Type': 'application/json'
        }

    def _url(self, endpoint):
        if endpoint.startswith('/'):
            endpoint = endpoint[1:]
        return FEATURES_API_BASE_URL + endpoint

    def _post(self, endpoint, data):
        url = self._url(endpoint)
        response = requests.post(url, headers=self._headers(), json=data)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    def _patch(self, endpoint, data):
        url = self._url(endpoint)
        response = requests.patch(url, headers=self._headers(), json=data)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    def _get(self, endpoint):
        url = self._url(endpoint)
        response = requests.get(url)
        if response.status_code != 200:
            raise RuntimeError(response.text)
        return response

    # Public methods
    # ---------------------------------------------------------------------------------------------

    def _post_or_patch_features(self, method, fname, acronyms, values, mapping='beryl'):

        assert method in ('post', 'patch')
        assert fname
        assert mapping
        assert acronyms is not None
        assert values is not None
        assert len(acronyms) == len(values)

        # Prepare the JSON payload.
        data = make_features(fname, acronyms, values, mapping=mapping)
        payload = {'fname': fname, 'json': data}

        # Make a POST request to /api/buckets/<uuid>.
        # try:
        if method == 'post':
            response = self._post(f'buckets/{self.bucket_uuid}', payload)
        elif method == 'patch':
            response = self._patch(f'buckets/{self.bucket_uuid}/{fname}', payload)
        # print(response.json()['message'])
        # except RuntimeError as e:
        #     print(f"Error while making {method} request: {e}")

    def create_features(self, fname, acronyms, values, mapping='beryl'):
        """Create new features in the bucket."""
        self._post_or_patch_features('post', fname, acronyms, values, mapping=mapping)

    def list_features(self):
        """Return the list of fnames in the bucket."""
        response = self._get(f'buckets/{self.bucket_uuid}')
        fnames = response.json()['features']
        return fnames

    def get_features(self, fname):
        """Retrieve features in the bucket."""
        assert fname
        response = self._get(f'/buckets/{self.bucket_uuid}/{fname}')
        features = response.json()
        return features

    def patch_features(self, fname, acronyms, values, mapping='beryl'):
        """Update existing features in the bucket."""
        self._post_or_patch_features('patch', fname, acronyms, values, mapping=mapping)


# -------------------------------------------------------------------------------------------------
# Entry-point
# -------------------------------------------------------------------------------------------------

def test_upload():
    bucket_uuid = 'myuuid'
    fname = 'newfeatures'

    acronyms = ['CP', 'SUB']
    values = [42, 420]

    up = FeatureUploader(bucket_uuid)
    up.create_features(fname, acronyms, values)

    print(up.list_features())

    features = up.get_features(fname)
    print(features)

    values[1] = 10
    up.patch_features(fname, acronyms, values)


if __name__ == '__main__':
    test_upload()

    # generate_colormaps()
    # process_slices()
    # mappings = get_mappings()
    # generate_regions_json(mappings)
    # generate_regions_css(mappings)
    # generate_ephys_features()
    # generate_bwm_features()
    # generate_custom_features()

    ##############

    # Test on 1 file.
    # path = DATA_DIR / "svg"
    # run_single(DATA_DIR / "swanson.svg")
    # make_slices_json(path)

    # Make the JSON feature file and the CSS files.
    # process_features(DATA_DIR / 'pqt')
    # makeRegions(DATA_DIR / 'pqt')
