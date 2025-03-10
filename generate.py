#!/usr/bin/env python
# coding: utf-8

# -------------------------------------------------------------------------------------------------
# Imports
# -------------------------------------------------------------------------------------------------

from itertools import groupby
import json
from math import isnan
from operator import itemgetter
# from pathlib import Path
from textwrap import dedent

import numpy as np
import pandas as pd
from pandas.core.groupby import DataFrameGroupBy

from tools.process import MAPPINGS, DATA_DIR, ROOT_ID, ROOT_DIR, save_json, write_text
from server import new_uuid, create_bucket_metadata, create_bucket, create_features, get_bucket


# -------------------------------------------------------------------------------------------------
# Constants
# -------------------------------------------------------------------------------------------------

BWM_FSETS = ('choice', 'feedback', 'stimulus',
             'wheel_speed', 'wheel_velocity')
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


# -------------------------------------------------------------------------------------------------
# Utils processing
# -------------------------------------------------------------------------------------------------

def float_json(x):
    return float(f'{x:.6g}') if not isnan(x) else None


def get_stats(v):
    return {
        'mean': float_json(np.mean(v)),
        'median': float_json(np.median(v)),
        'std': float_json(np.std(v)),
        'min': float_json(np.min(v)),
        'max': float_json(np.max(v)),
    }


# -------------------------------------------------------------------------------------------------
# Region processing
# -------------------------------------------------------------------------------------------------

def get_mappings():
    # open the pqt files and return a mappings dictionary
    # {mapping_name: [{idx: ..., atlas_id: ..., acronym: ..., name: ..., hex: ...}]}
    out = {}
    mappings = MAPPINGS
    for mapping in mappings:

        # Load the parquet file.
        regions = pd.read_parquet(DATA_DIR / f'pqt/{mapping}_regions.pqt')

        # HACK: discrepancy in column names
        names = regions['atlas_name']

        # HACK: fiber_or_vent is only in the allen mapping
        if 'fiber_or_vent' in regions:
            fiber_or_vent = regions['fiber_or_vent']
        else:
            fiber_or_vent = [False for _ in range(len(regions))]

        out[mapping] = [
            {
                'idx': abs(idx_),
                'atlas_id': atlas_id_,
                'acronym': acronym_,
                'name': name_,
                'hex': hex_,
                'leaf': leaf_,
                'fiber_or_vent': fiber_or_vent_,
            }
            for idx_, atlas_id_, acronym_, name_, hex_, leaf_, fiber_or_vent_ in zip(
                regions['idx'], regions['atlas_id'], regions['acronym'],
                names, regions['hex'], regions['leaf'],
                fiber_or_vent,
            )
        ]
        # out[mapping] = sorted(out[mapping], key=itemgetter('idx'))
    return out


# mappings is a dictionary {mapping_name: [{idx, atlas_id, acronym, name,
# hex}]}
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
            f'''    --region-{mapping}-{idx}
                : {r['hex']}; /* {r['acronym']} */ '''
            for idx, r in regions.items())
        css += f'/* Mapping {
            mapping}: default region colors */\n\n:root {{\n\n{colors}\n\n}}\n'

        css += ''.join(
            dedent(f'''
            /* {r['acronym']} */
            .bar-plot li.{mapping}_region_{idx} .bar {{ background-color: var(--region-{mapping}-{idx}); }}
            .bar-plot li.{mapping}_region_{idx} .acronym {{ color: var(--region-{mapping}-{idx}); }}
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
        # NOTE: if ddof is not set to 0, will return NaN if only 1 element in
        # the groupby DF...
        'std': df.std(ddof=0, numeric_only=True),
        'min': df.min(),
        'max': df.max(),
    }


def lateralize_features(df):
    for c in df.columns:
        if c.startswith('atlas_id'):
            df[c] = -df[c].abs()
    return df


# features dictionary:
# {mapping: {fet: {data: {atlas_id: {stat: value}}}, statistics: {stat: {m

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

        # Collect statistics across regions, for each feature. Used for bar
        # plot.
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

        # for each mapping, the list of region idx of regions to keep, or None
        # if all are kept
        self.kept = {mapping: None for mapping in MAPPINGS}

    def keep(self, mapping, atlas_ids):
        # for a given mapping, take a pandas Series with a bunch of atlas_ids, and
        # will save the occurring regions to only keep those.
        self.kept[mapping] = set(self.atlas_id_map[mapping][atlas_id]
                                 for atlas_id in atlas_ids if abs(atlas_id) != ROOT_ID)

    def get_regions(self, mapping):
        # return the kept brain regions
        return {r['idx']: r for r in self.mappings[mapping] if r['idx'] in self.kept[mapping]}


# -------------------------------------------------------------------------------------------------
# Feature processing
# -------------------------------------------------------------------------------------------------

# NOTE: these functions are obsolete, to be deleted

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

    # Extra features (column name is fname).
    # df_block = pd.read_parquet(DATA_DIR / 'pqt/block_bwm.pqt')
    df_choice = pd.read_parquet(DATA_DIR / 'pqt/choice_bwm.pqt')
    df_feedback = pd.read_parquet(DATA_DIR / 'pqt/feedback_bwm.pqt')
    df_stimulus = pd.read_parquet(DATA_DIR / 'pqt/stimulus_bwm.pqt')
    df_wheel_speed = pd.read_parquet(DATA_DIR / 'pqt/wheel_speed_bwm.pqt')
    df_wheel_velocity = pd.read_parquet(
        DATA_DIR / 'pqt/wheel_velocity_bwm.pqt')

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

    # df_block = _debooleanize(df_block)
    df_choice = _debooleanize(df_choice)
    df_feedback = _debooleanize(df_feedback)
    df_stimulus = _debooleanize(df_stimulus)
    df_wheel_speed = _debooleanize(df_wheel_speed)
    df_wheel_velocity = _debooleanize(df_wheel_velocity)

    for bucket in BWM_FSETS:
        df = locals()[f'df_{bucket}']

        # Lateralize the sessions DataFrame.
        df = lateralize_features(df)
        feature_names = get_feature_names(df)

        br = FeatureBrainRegions()

        # Aggregate by region, for each mapping. We use the atlas_id_X where X is the first letter
        # of the mapping.
        dfg = df.groupby(f'atlas_id_{mapping[0]}')
        features = generate_features_groupedby(br, mapping, dfg, feature_names)
        out = {mapping: features}
        save_json(out, DATA_DIR / f"json/features_bwm_{bucket}.json")


# -------------------------------------------------------------------------------------------------
# Default features
# -------------------------------------------------------------------------------------------------

def iter_fset_features(fset):
    assert fset
    json_path = ROOT_DIR / 'data/json' / f"features_{fset}.json"
    with open(json_path, 'r') as f:
        contents = json.load(f)
    for mapping, fet in contents.items():
        for fname, d in fet.items():
            yield fname, mapping, d


def remove_leaves(tree, check):
    if isinstance(tree, dict):
        for key, value in list(tree.items()):
            if isinstance(value, dict):
                remove_leaves(value, check)
            else:
                if not check(key, value):
                    print(f"remove tree leaf {value}")
                    del tree[key]
    elif isinstance(tree, list):
        for item in tree:
            remove_leaves(item, check)


def create_ephys_features(patch=False, dry_run=False):
    alias = 'ephys'
    short_desc = 'Ephys atlas'
    tree = None

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket /api/buckets/{alias} ({bucket_uuid})")
        if not dry_run:
            metadata = create_bucket_metadata(
                bucket_uuid, alias=alias, short_desc=short_desc, tree=tree)
            assert 'token' in metadata
            print(create_bucket(bucket_uuid, metadata, alias=alias))

    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']
    print(bucket_uuid)

    # Go through the features and mappings.
    for fname, mappings in groupby(
            sorted(iter_fset_features('ephys'), key=itemgetter(0)), itemgetter(0)):
        print(f'/api/buckets/{alias}/{fname}')
        json_data = {'mappings': {mapping: d for _, mapping, d in mappings}}
        if not dry_run:
            print(create_features(bucket_uuid, fname, json_data, patch=patch))


def create_bwm_features(patch=False, dry_run=False):
    alias = 'bwm'
    short_desc = 'Brain wide map'
    sets = BWM_FSETS

    # Skip if the bucket already exists.
    if isinstance(get_bucket(alias), tuple):
        bucket_uuid = new_uuid()
        print(f"Create new bucket /api/buckets/{alias} ({bucket_uuid})")
        if not dry_run:
            metadata = create_bucket_metadata(
                bucket_uuid, alias=alias, short_desc=short_desc)
            assert 'token' in metadata
            print(create_bucket(bucket_uuid, metadata, alias=alias))

    # Retrieve the bucket uuid.
    bucket = get_bucket(alias)
    bucket_uuid = bucket['metadata']['uuid']

    # Go through the features and mappings and create the features.
    fnames = []
    for set in sets:
        for fname, mappings in groupby(sorted(iter_fset_features(
                f'bwm_{set}'), key=itemgetter(0)), itemgetter(0)):
            fname = f'{set}_{fname}'
            fnames.append(fname)
            print(f'/api/buckets/{alias}/{fname}')
            if not dry_run:
                feature_data = {'mappings': {
                    mapping: d for _, mapping, d in mappings}}
                print(create_features(bucket_uuid,
                      fname, feature_data, patch=patch))

    # Generate the BWM tree.
    tree = {
        f'{set}': {
            'decoding': {
                'main': f'{set}_decoding',
                'effect': f'{set}_decoding_effect',
                'frac_significant': f'{set}_decoding_frac_significant',
                'significant': f'{set}_decoding_significant',
            },
            'euclidean': {
                'effect': f'{set}_euclidean_effect',
                'latency': f'{set}_euclidean_latency',
                'significant': f'{set}_euclidean_significant',
            },
            'mannwhitney': {
                'effect': f'{set}_mannwhitney_effect',
                'significant': f'{set}_mannwhitney_significant'
            },

            'glm_effect': f'{set}_glm_effect',
            'manifold': f'{set}_manifold',
            'single_cell': f'{set}_single_cell',
        }
        for set in sets
    }

    # Remove tree features that do not exist.
    remove_leaves(tree, lambda _, fname: fname in fnames)

    # Patch the tree.
    if not dry_run:
        # Retrieve the existing bucket metadata.
        metadata = bucket['metadata']
        # Update the tree in the bucket metadata.
        metadata['tree'] = tree
        # Patch the file.
        print(create_bucket(bucket_uuid, metadata, alias=alias, patch=True))


if __name__ == '__main__':
    pass
    # mappings = get_mappings()
    # generate_regions_json(mappings)

    # generate_bwm_features()
    # create_bwm_features(patch=False, dry_run=False)
