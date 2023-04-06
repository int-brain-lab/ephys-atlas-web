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
from datetime import datetime, timezone
from math import isnan
from operator import itemgetter
from pathlib import Path
from textwrap import dedent
from xml.dom import minidom

import lxml.etree as le
import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from ibllib.atlas.regions import BrainRegions
from joblib import Parallel, delayed
from matplotlib import cm
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
COLORMAPS = ('viridis', 'cividis', 'magma')
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
        json.dump(d, f, indent=1)


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
# Region processing
# -------------------------------------------------------------------------------------------------

def get_mappings():
    # open the pqt files and return a mappings dictionary
    # {mapping_name: [{idx: ..., atlas_id: ..., acronym: ..., name: ..., hex: ...}]}
    out = {}
    for mapping in MAPPINGS:
        regions = pd.read_parquet(
            DATA_DIR / f'pqt/{mapping}_regions.pqt')
        out[mapping] = [
            {
                'idx': abs(idx_),
                'atlas_id': atlas_id_,
                'acronym': acronym_,
                'name': name_,
                'hex': hex_,
            }
            for idx_, atlas_id_, acronym_, name_, hex_ in zip(
                regions['idx'], regions['atlas_id'], regions['acronym'], regions['atlas_name'], regions['hex'])
        ]
    return out


# mappings is a dictionary {mapping_name: [{idx, atlas_id, acronym, name, hex}]}
def generate_regions_json(mappings):
    print("Generating regions.json...")
    filename = DATA_DIR / 'json/regions.json'
    save_json(mappings, filename)


def generate_regions_css(mappings):
    print("Generating region_colors.css")
    css = ''
    for mapping, regions in mappings.items():

        colors = '\n'.join(
            f'''    --region-{mapping}-{r['idx']}: {r['hex']}; /* {r['acronym']} */ '''
            for r in regions)
        css += f'/* Mapping {mapping}: default region colors */\n\n:root {{\n\n{colors}\n\n}}\n'

        css += ''.join(
            dedent(f'''
            /* {r['acronym']} */
            #bar-plot li.{mapping}_region_{r['idx']} .bar {{ background-color: var(--region-{mapping}-{r['idx']}); }}
            #bar-plot li.{mapping}_region_{r['idx']} .acronym {{ color: var(--region-{mapping}-{r['idx']}); }}
            ''') for r in regions)

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
        'std': df.std(numeric_only=True),
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
        for region in regions:
            atlas_id = region['atlas_id']
            regionIdx = region['idx']

            d = {
                stat: float_json(dfg.loc[atlas_id][fet])
                for stat, dfg in dfs.items() if dfg is not None and ~np.isnan(dfg.loc[atlas_id][fet])
            }
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
                r['atlas_id']: r['idx']
                for r in regions
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
        return [r for r in self.mappings[mapping] if r['idx'] in self.kept[mapping]]


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
    # Load features.
    df_sessions = pd.read_parquet(DATA_DIR / 'pqt/bwm_features.pqt')

    # Lateralize the sessions DataFrame.
    df_sessions = lateralize_features(df_sessions)
    feature_names = get_feature_names(df_sessions)

    br = FeatureBrainRegions()

    # Aggregate by region, for each mapping. We use the atlas_id_X where X is the first letter
    # of the mapping.
    out = {}
    # NOTE: only Beryl is supported for the BWM features
    for mapping in ('beryl',):
        df = df_sessions.groupby(f'atlas_id_{mapping[0]}')
        features = generate_features_groupedby(
            br, mapping, df, feature_names)
        out[mapping] = features

    save_json(out, DATA_DIR / f"json/features_bwm.json")


# -------------------------------------------------------------------------------------------------
# Custom features
# -------------------------------------------------------------------------------------------------

class FeatureGenerator:
    def __init__(self, mapping='Beryl'):
        self.br = BrainRegions()
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
            'mapping': self.mapping,
            'region_idx': encode_numpy_array(self.idx),
            'data': [
                (name, stat, encode_numpy_array(values)) for (name, stat), values in self.values.items()
            ]
        }
        return base64_encode(self.compress(json.dumps(obj)))

    def decode(self, s):
        obj = json.loads(self.decompress(base64_decode(s)))
        assert obj['mapping'] == self.mapping

        # self.set_acronyms(obj['acronyms'])
        self.idx = decode_numpy_array(obj['region_idx'], np.int32)

        for name, stat, b64_data in obj['data']:
            values = decode_numpy_array(b64_data, np.float32)
            self.add_values(name, values, stat=stat)

    def __repr__(self):
        return f'<FeatureGenerator {self.mapping=} with {len(self.values)} set(s) of {self.idx.size} values>'


def generate_custom_features():
    mapping = 'Allen'

    fg = FeatureGenerator(mapping)
    br = fg.br

    acronyms = np.unique(br.acronym[br.mappings[mapping]])
    values = np.random.randn(acronyms.size)

    fg.set_acronyms(acronyms)
    fg.add_values("fname", values)
    fg.add_values("fname2", values+1)
    fg.add_values("fname3", values+2)
    fg.add_values("fname4", values+3)
    fg.add_values("fname5", values+4)
    s = fg.encode()
    print(len(s))
    fg.decode(s)
    return

    feature_data = {}
    fset = 'fset'
    feature_data[fset] = {
        mapping: {
            'fname': {"data": {}, "statistics": {}},
            'fname2': {"data": {}, "statistics": {}}
        }
    }

    for idx, v in zip(fg.idx, values):
        feature_data[fset][mapping]['fname']["data"][f'{idx}'] = {
            "mean": float_json(v), }
        feature_data[fset][mapping]['fname2']["data"][f'{idx}'] = {
            "mean": float_json(v+1), }
    # feature_data[feature][mapping][feature1]["statistics"]["mean"] = get_stats(
    #     vals_mean)
    # feature_data[feature][mapping][feature1]["statistics"]["median"] = get_stats(
    #     vals_median)

    # for acr, v in zip(acronyms, vals2):
    #     feature_data[feature][mapping][feature2]["data"][f'{idx}'] = {
    #         "mean": float_json(v)}
    # feature_data[feature][mapping][feature2]["statistics"]["mean"] = get_stats(
    #     vals2)

    # print(feature_data)
    s2 = base64_encode(gzip_compress(json.dumps(feature_data, indent=1)))
    print(len(s2))
    print(len(s) / float(len(s2)))


# -------------------------------------------------------------------------------------------------
# Entry-point
# -------------------------------------------------------------------------------------------------
if __name__ == '__main__':

    # generate_colormaps()
    # mappings = get_mappings()
    # generate_regions_json(mappings)
    # generate_regions_css(mappings)
    # generate_ephys_features()
    # generate_bwm_features()
    generate_custom_features()

    ##############

    # Test on 1 file.
    # path = DATA_DIR / "svg"
    # run_single(DATA_DIR / "swanson.svg")
    # make_slices_json(path)

    # Make the JSON feature file and the CSS files.
    # process_features(DATA_DIR / 'pqt')
    # makeRegions(DATA_DIR / 'pqt')
