#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from datetime import datetime, timezone
import json
import lxml.etree as le
from math import isnan
import os
import re
from operator import itemgetter
from textwrap import dedent
from pathlib import Path
from xml.dom import minidom

from joblib import Parallel, delayed
from tqdm import tqdm
import numpy as np
import pandas as pd
from pandas.core.groupby import DataFrameGroupBy
from matplotlib import cm
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, LinearSegmentedColormap, to_hex


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
COLORMAP = 'viridis'
COLORMAP_VALUE_COUNT = 128  # number of different values for the colormap
DATA_DIR = ROOT_DIR / "data"
AXES = ('coronal', 'horizontal', 'sagittal')
NS = "http://www.w3.org/2000/svg"
SIMPLIFY_CMD = "inkscape --batch-process --actions='EditSelectAll;SelectionSimplify;FileSave;FileClose'"
RE_PATH = re.compile(r'<path id="path[0-9]+"')
RE_WHITESPACE = re.compile(r'\s+(?=<)')
STYLE = "* { stroke-linecap: butt; stroke-linejoin: round; fill: white; stroke: black; }"


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
    df['atlas_id'] = -df['atlas_id'].abs()
    return df


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

def generate_regions_html(idx, acronym):
    print("Generating regions.html...")
    html = ''.join(
        f'''
    <li class="region_{idx_}">
        <div class="acronym">{acronym_}</div>
        <div class="bar_wrapper">
            <div class="bar"></div>
        </div>
    </li>''' for (idx_, acronym_) in zip(idx, acronym))
    write_text(html, DATA_DIR / 'regions.html')


def generate_regions_js(idx, acronym):
    # Generate regions.js, git tracked.
    print("Generating regions.js...")
    js = ''.join(
        f'''
    "{idx_}": "{acronym_}",''' for (idx_, acronym_) in zip(idx, acronym))
    js = f'const REGIONS = {{\n{js}\n}}\n'
    write_text(js, ROOT_DIR / 'js/regions.js')


def generate_regions_css(idx, hex, acronym):
    print("Generating region_colors.css")
    css = '\n'.join(
        f'''    --region-{idx_}: {hex_}; /* {acronym_} */ ''' for (idx_, hex_, acronym_) in zip(idx, hex, acronym))

    css = f'/* Default region colors */\n\n:root {{\n\n{css}\n\n}}\n'
    css += ''.join(
        dedent(f'''
        /* {acronym_} */
        # bar-plot li.region_{idx_} .bar {{ background-color: var(--region-{idx_}); }}
        # bar-plot li.region_{idx_} .acronym {{ color: var(--region-{idx_}); }}
        ''') for (idx_, hex_, acronym_) in zip(idx, hex, acronym))
    write_text(css, DATA_DIR / 'css/region_colors.css')


class FeatureProcessor:
    def __init__(self, df, name):
        self.name = name
        # Brain regions
        self.br = pd.read_parquet(DATA_DIR / 'pqt/brain_regions_for_viz.pqt')

        # df is a DataFrame with atlas_id as index, and one or several features.
        self.df = df

        # df is a grouped DataFrame where atlas_id is the index.
        if isinstance(df, DataFrameGroupBy):
            self.fet_m = df.mean(numeric_only=True)
            self.fet_s = df.std(numeric_only=True)
            self.fet_min = df.min()
            self.fet_max = df.max()
        else:
            self.fet_m = df
            self.fet_s = None
            self.fet_min = None
            self.fet_max = None

        self.features = self.fet_m.columns
        self.regions = self.fet_m.index  # should be atlas_id

        # Keep the brain regions that appear in the DataFrame.
        keep = np.in1d(self.br['atlas_id'], self.regions)
        # print(f"Keep {keep.sum()}/{len(keep)} brain regions.")
        self.br = self.br.loc[keep]

        # Mapping atlas_id => idx
        self.br_mapping = {int(atlas_id): int(idx)
                           for atlas_id, idx in zip(self.br['atlas_id'], self.br['idx'])}

        # Brain regions attributes for all regions appearing in the DataFrame.
        self.atlas_id = self.br['atlas_id']
        self.idx = self.br['idx']
        self.acronym = self.br['acronym']
        self.hex = self.br['hex']

    def generate_regions(self):
        generate_regions_html(self.idx, self.acronym)
        generate_regions_js(self.idx, self.acronym)
        generate_regions_css(self.idx, self.hex, self.acronym)

    def generate_features_json(self, filename):
        print(f"Generating {filename}")
        # Each column of df corresponds to a feature.
        # acronyms = df.acronym.first()  # index is atlas_id

        # All dataframe atlas_ids must be in the brain region atlas.
        assert(np.all(np.in1d(self.regions, self.atlas_id)))

        data = {fet: {self.br_mapping[atlas_id]:        # the key is the brain region idx
                      {
            'mean': float_json(self.fet_m.loc[atlas_id][fet]),
            'std': float_json(self.fet_s.loc[atlas_id][fet]),
            'min': float_json(self.fet_min.loc[atlas_id][fet]),
            'max': float_json(self.fet_max.loc[atlas_id][fet]),
        }
            if self.fet_s is not None else
            {'mean': float_json(self.fet_m.loc[atlas_id][fet])}
            for atlas_id in self.regions} for fet in self.features}

        # Generate the Python dictionary with all feature/region values.
        features_obj = {fet:
                        {"data":   data[fet],
                         # Collect statistics across regions, for each feature. Used for bar plot.
                         "statistics": {
                            'mean': float_json(self.fet_m[fet].mean()),
                            'std': float_json(self.fet_m[fet].std()),
                            'min': float_json(self.fet_m[fet].min()),
                            'max': float_json(self.fet_m[fet].max()),
                        }
                        } for fet in self.features}

        save_json(features_obj, DATA_DIR / "json" / filename)

    def generate_features_css(self, values, filename):
        print(f"Generating {filename}")

        cmap = cm.get_cmap(COLORMAP, COLORMAP_VALUE_COUNT)
        br_mapping = self.br_mapping
        regions = self.atlas_id
        acronyms = self.acronym
        colors = self.hex

        # Normalization.
        norm = plt.Normalize(vmin=values.min(), vmax=values.max())
        values_n = norm(values)

        # Compute the color of each brain region, using a colormap.
        colors = cmap(values_n)

        # Generate the CSS class rules.
        region_colors = [
            (br_mapping[atlas_id],
             f"svg path.region_{br_mapping[atlas_id]} {{ fill: {to_hex(color)}; }} /* {acronym}: {values.loc[atlas_id]} */")
            for (atlas_id, color, acronym) in zip(regions, colors, acronyms)]

        region_bars = [
            (br_mapping[atlas_id],
             f"#bar-plot li.region_{br_mapping[atlas_id]} .bar {{ width: {value * 100:.2f}%; }} /* {acronym}: {values.loc[atlas_id]} */")
            for (atlas_id, value, acronym) in zip(regions, values_n, acronyms)]

        css = '''/* Region colors */\n\n'''
        css += '\n'.join(s for _, s in sorted(region_colors,
                         key=itemgetter(0)))

        css += '''\n\n/* Bar plot */\n\n'''
        css += '\n'.join(s for _, s in sorted(region_bars, key=itemgetter(0)))

        # HACK: remove NaNs
        css = css.replace('nan%', '0%')

        # Save the CSS file.
        write_text(css, DATA_DIR / "css" / filename)

    def generate_features(self):
        # Generate the JSON feature file.
        self.generate_features_json(f'features_{self.name}.json')

        # Generate one CSS file per feature.
        for fet in self.features:
            self.generate_features_css(
                self.fet_m[fet], f'regions_{self.name}_{fet}.css')


# -------------------------------------------------------------------------------------------------
# Feature processing
# -------------------------------------------------------------------------------------------------

def process_sessions(df_sessions, name):
    # Group by atlas_id
    df = df_sessions.groupby('atlas_id')

    # Feature processor.
    fp = FeatureProcessor(df, name)
    fp.generate_features()


def process_grouped(df, name):
    # Feature processor.
    fp = FeatureProcessor(df, name)
    fp.generate_features()


def make_ephys_features():
    # Process features.
    df_sessions = pd.read_parquet(
        DATA_DIR / 'pqt/features_for_viz_lateralised.pqt')

    # Lateralize the sessions DataFrame.
    df_sessions = lateralize_features(df_sessions)

    # Process the DataFrame.
    process_sessions(df_sessions, 'ephys')


def make_bwm_features():
    # Load a CSV file and remap to use the atlas_id instead of the acronym.
    for name in ('block', 'choice', 'reward', 'stimulus'):
        df = pd.read_csv(DATA_DIR / f'csv/{name}.csv')
        df = df[df.columns[:4]]
        df = df.dropna(subset=['region'])

        br = pd.read_parquet(DATA_DIR / 'pqt/brain_regions_for_viz.pqt')
        br_mapping = {acronym: int(atlas_id)
                      for atlas_id, acronym in zip(br['atlas_id'], br['acronym'])}

        df['atlas_id'] = [br_mapping[acronym] for acronym in df['region']]
        df = df.set_index('atlas_id')
        df = df.drop(columns=['region'])

        process_grouped(df, f"bwm_{name}")


# -------------------------------------------------------------------------------------------------
# Entry-point
# -------------------------------------------------------------------------------------------------

if __name__ == '__main__':

    make_ephys_features()

    ##############

    # Test on 1 file.
    # path = DATA_DIR / "svg"
    # run_single(DATA_DIR / "swanson.svg")
    # make_slices_json(path)

    # Make the JSON feature file and the CSS files.
    # process_features(DATA_DIR / 'pqt')
    # make_regions(DATA_DIR / 'pqt')
