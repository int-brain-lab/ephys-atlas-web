#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from datetime import datetime, timezone
import json
import lxml.etree as le
import os
import re
from pathlib import Path
from xml.dom import minidom

from joblib import Parallel, delayed
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


def save_json(d, filename):
    with open(filename, "w") as f:
        json.dump(d, f)


# -------------------------------------------------------------------------------------------------
# Processing functions
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
    save_json(out, DATA_DIR / "slices.json")


def run_parallel(dir, func):
    svg_files = sorted(dir.iterdir())
    Parallel(n_jobs=-2)(delayed(func)(file) for file in svg_files)


def run_serial(dir, func):
    svg_files = sorted(dir.iterdir())
    for file in svg_files:
        func(file)


if __name__ == '__main__':
    path = DATA_DIR / "svg"

    # # Step 4.
    # run_parallel(path, simplify)

    # # Step 5.
    # run_parallel(path, svgo)

    # # Step 6.
    # run_parallel(path, remove_path_id)

    # # Step 7.
    # run_parallel(path, clean_svg)

    # Step 8.
    make_slices_json(path)

    #
    # Test on 1 file.
    # print(get_figure_string(path / "coronal_286.svg"))
