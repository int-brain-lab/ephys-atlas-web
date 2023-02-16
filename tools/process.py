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


def run_parallel(dir, func):
    svg_files = sorted(dir.iterdir())
    Parallel(n_jobs=-2)(delayed(func)(file) for file in svg_files)


def run_serial(dir, func):
    svg_files = sorted(dir.iterdir())
    for file in svg_files:
        func(file)


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


def process_features(dir):
    # Take as input features_for_viz.pqt and brain_regions_for_viz.pqt, and generates files for the website.

    df = pd.read_parquet(dir / 'features_for_viz_lateralised.pqt')
    br = pd.read_parquet(dir / 'brain_regions_for_viz.pqt')

    # Lateralization.
    df['atlas_id'] = -df['atlas_id'].abs()

    # Mapping atlas_id => idx
    br_mapping = {int(atlas_id): int(idx)
                  for atlas_id, idx in zip(br['atlas_id'], br['idx'])}

    # Compute feature statistics per brain region.
    fet_m = df.groupby('atlas_id').mean(numeric_only=True)  # index is atlas_id
    features = fet_m.columns  # index is atlas_id
    regions = fet_m.index  # atlas_id
    acronyms = df.groupby('atlas_id').acronym.first()  # index is atlas_id

    # All dataframe atlas_ids must be in the brain region atlas.
    assert(np.all(np.in1d(regions, br['atlas_id'])))

    fet_s = df.groupby('atlas_id').std(numeric_only=True)
    fet_min = df.groupby('atlas_id').min()
    fet_max = df.groupby('atlas_id').max()

    data = {fet: {br_mapping[atlas_id]:        # the key is the brain region idx
            {
                'mean': float_json(fet_m.loc[atlas_id][fet]),
                'std': float_json(fet_s.loc[atlas_id][fet]),
                'min': float_json(fet_min.loc[atlas_id][fet]),
                'max': float_json(fet_max.loc[atlas_id][fet]),
    } for atlas_id in regions} for fet in features}

    # Generate the Python dictionary with all feature/region values.
    features_obj = [
        {"feature": fet,
         "data":   data[fet],
         "statistics": {  # Collect statistics across regions, for each feature. Used for client bar plot.
             'mean': float_json(fet_m[fet].mean()),
             'std': float_json(fet_m[fet].std()),
             'min': float_json(fet_m[fet].min()),
             'max': float_json(fet_m[fet].max()),
         }
         } for fet in features]

    # Save the features.json file.
    save_json(features_obj, DATA_DIR / 'features.json')

    # Generate CSS stylesheets for each feature.
    cmap = cm.get_cmap(COLORMAP, COLORMAP_VALUE_COUNT)

    for fet in features:
        # Get feature values across all brain regions.
        values = fet_m[fet]

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

        # Save the CSS file.
        write_text(css, DATA_DIR / f'regions_{fet}.css')


def make_regions(dir):

    from ibllib.atlas.regions import BrainRegions
    br = BrainRegions()
    order = br.order
    # print(order)

    # Load the brain regions dataframe.
    br = pd.read_parquet(dir / 'brain_regions_for_viz.pqt')

    # Only keep the brain regions appear in the features file.
    df = pd.read_parquet(dir / 'features_for_viz_lateralised.pqt')
    df['atlas_id'] = -df['atlas_id'].abs()
    keep = np.in1d(br['atlas_id'], df['atlas_id'].unique())
    print(f"Keep {keep.sum()}/{len(keep)} brain regions.")
    order = order[keep]

    idx = br['idx'][keep]
    acronym = br['acronym'][keep]
    hex = br['hex'][keep]

    # Generate regions.html, to copy manually into index.html.
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

    # Generate regions_colors.css, with the default brain region colors.
    print("Generating region_colors.css")
    css = '\n'.join(
        f'''    --region-{idx_}: {hex_}; /* {acronym_} */ ''' for (idx_, hex_, acronym_) in zip(idx, hex, acronym))

    css = f'/* Default region colors */\n\n:root {{\n\n{css}\n\n}}\n'
    css += ''.join(
        dedent(f'''
        /* {acronym_} */
        #bar-plot li.region_{idx_} .bar {{ background-color: var(--region-{idx_}); }}
        #bar-plot li.region_{idx_} .acronym {{ color: var(--region-{idx_}); }}
        ''') for (idx_, hex_, acronym_) in zip(idx, hex, acronym))
    write_text(css, DATA_DIR / 'region_colors.css')


# -------------------------------------------------------------------------------------------------
# Entry-point
# -------------------------------------------------------------------------------------------------

if __name__ == '__main__':
    path = DATA_DIR / "svg"

    # Test on 1 file.
    # run_single(DATA_DIR / "swanson.svg")
    # make_slices_json(path)

    # Make the JSON feature file and the CSS files.
    process_features(DATA_DIR / 'pqt')
    make_regions(DATA_DIR / 'pqt')
