import pandas as pd

from ibllib.atlas.regions import BrainRegions
from iblutil.numerical import ismember
import numpy as np
from pathlib import Path
save_path = Path('/Users/admin/Downloads/ONE/scratch/')
br = BrainRegions()

problem_nodes = np.load(save_path.joinpath('problem_nodes.npy'), allow_pickle=True)

# TODO for ids need some representation for HY-un

problem_map = {}
problem_inverse_map = {}
for p in problem_nodes:
    level = br.get(br.acronym2id(p))['level'][0]
    problem_map[p] = {'acronym': p + '-un', 'level': level + 1}
    problem_inverse_map[p + '-un'] = p

problems = list(problem_inverse_map.keys())

def navigate_tree(acronym, tree, all_acronyms):
    exists = tree.get(acronym, None)
    if exists is not None:
        return tree

    if acronym in problems:
        tree[acronym] = np.array([acronym], dtype=object)
        return tree

    # if acronym in end_roads:
    #     tree = navigate_tree(end_of_the_road[acronym], tree, all_acronyms)
    #     return tree

    desc = br.descendants(br.acronym2id(acronym))
    if len(desc['id']) == 1:
        tree[acronym] = np.array([acronym], dtype=object)
    else:
        level = desc['level'] - desc['level'][0]
        acr = desc['acronym'][np.where(level == 1)[0]]
        extra = problem_map.get(acronym, None)
        if extra is not None:
            if extra['acronym'] in all_acronyms:
                acr = np.r_[acr, np.array(extra['acronym'])]

        tree[acronym] = acr
        for a in acr:
            tree = navigate_tree(a, tree, all_acronyms)

    return tree


def process_data(regions, values, hemisphere=None):
    regions = np.asarray(regions)
    values = np.asarray(values)
    assert regions.size == values.size, 'Regions and values must have the same number of rows'
    # If they are strings we assume they are acronyms
    data = {}
    if np.issubdtype(regions.dtype, np.str_):
        # TODO better assertion here that all are strings
        assert hemisphere, 'when providing acronyms must pass in the hemisphere to display on'
        isin, _ = ismember(regions, br.acronym[:br.n_lr])
        assert all(isin), f'The acronyms: {regions[~isin]}, are not in the Allen annotation tree'
        index_a, values_a = process_acronyms(regions, values, hemisphere)
        data['allen'] = {'index': index_a, 'values': values_a}
        ids = br.acronym2id(regions, mapping='Allen-lr', hemisphere=hemisphere)
        index_b, values_b = process_mappings(ids, values, mapping='Beryl-lr')
        data['beryl'] = {'index': index_b, 'values': values_b}
        index_c, values_c = process_mappings(ids, values, mapping='Cosmos-lr')
        data['cosmos'] = {'index': index_c, 'values': values_c}
    # Else we assume these are atlas ids
    else:
        isin, _ = ismember(regions, br.id)
        assert all(isin), f'The atlas ids: {regions[~isin]}, are not in the Allen annotation tree'
        index, values = process_ids(regions, values)
        data['allen'] = {'index': index, 'values': values}
        index_b, values_b = process_mappings(regions, values, mapping='Beryl-lr')
        data['beryl'] = {'index': index_b, 'values': values_b}
        index_c, values_c = process_mappings(regions, values, mapping='Cosmos-lr')
        data['cosmos'] = {'index': index_c, 'values': values_c}

    return data


def process_mappings(regions, values, mapping='Beryl'):
    m_regions = br.id2id(regions, mapping=mapping)
    isin, iloc = ismember(m_regions, br.id)

    df = pd.DataFrame({'regions': iloc, 'vals': values})
    res = df.groupby('regions').mean()
    return res.index.values, res.vals.values


def process_ids(regions, values):
    # Split into hemispheres
    left_regions = regions < 0
    right_regions = regions >= 0
    index = np.array([])
    vals = np.array([])
    if np.sum(left_regions) > 0:
        index_l, values_l = process_acronyms(br.id2acronym(regions[left_regions]), values[left_regions], 'left')
        index = np.r_[index, index_l]
        vals = np.r_[vals, values_l]
    if np.sum(right_regions) > 0:
        index_r, values_r = process_acronyms(br.id2acronym(regions[right_regions]), values[right_regions], 'right')
        index = np.r_[index, index_r]
        vals = np.r_[vals, values_r]

    return index, vals
def process_acronyms(regions, values, hemisphere):
    _, json_allen = process_allen(regions, values)
    _, json_swanson = process_swanson(regions, values)
    index = np.array([])
    vals = np.array([])
    # TODO don't loop
    for k, v in json_allen.items():
        index = np.r_[index, br.acronym2index(k, hemisphere=hemisphere)[1][0][0]]
        vals = np.r_[vals, v]

    for k, v in json_swanson.items():
        index = np.r_[index, br.acronym2index(k, hemisphere=hemisphere)[1][0][0]]
        vals = np.r_[vals, v]

    # TODO here check that the values are the same if we have them both in swanson
    un, ind, counts = np.unique(index, return_counts=True, return_index=True)
    duplicates = counts > 1
    for u in un[duplicates]:
        assert json_swanson[br.acronym[int(u)]] == json_allen[br.acronym[int(u)]]

    index = index[ind]
    vals = vals[ind]

    return index, vals




def process_swanson(acronyms, values):
    volume_acronyms = np.load(save_path.joinpath('volume_acronyms_swanson.npy'), allow_pickle=True)
    end_of_the_road = np.load(save_path.joinpath('end_of_the_roads_swanson.npy'), allow_pickle=True)[0]
    json_all, json_final = process_again(acronyms, values, volume_acronyms, end_of_the_road)
    return json_all, json_final

def process_allen(acronyms, values):
    volume_acronyms = np.load(save_path.joinpath('volume_acronyms.npy'), allow_pickle=True)
    end_of_the_road = np.load(save_path.joinpath('end_of_the_roads.npy'), allow_pickle=True)[0]
    json_all, json_final = process_again(acronyms, values, volume_acronyms, end_of_the_road)
    return json_all, json_final


def process_again(acronyms, values, volume_acronyms, end_of_the_road):
    # Need to remove the non ones, then add them back in
    isin, _ = ismember(acronyms, problems)
    if np.sum(isin) > 0:
        weird_acronyms = acronyms[isin]
        weird_values = values[isin]
        weird_levels = np.empty(weird_acronyms.shape)
        for i, w in enumerate(weird_acronyms):
            weird_levels[i] = problem_map[problem_inverse_map[w]]['level']
        acronyms = np.delete(acronyms, np.where(isin)[0])
        values = np.delete(values, np.where(isin)[0])


    if acronyms.size > 0:
        index = np.vstack(br.acronym2index(acronyms)[1])[:, 0]
        levels = br.level[index]
    else:
        levels = np.array([])
    if np.sum(isin) > 0:
        acronyms = np.r_[acronyms, weird_acronyms]
        values = np.r_[values, weird_values]
        levels = np.r_[levels, weird_levels]

    # Sort the acronyms and values so we deal with the ones with the lowest level first
    acronyms = acronyms[np.argsort(levels)]
    values = values[np.argsort(levels)]

    end_roads = list(end_of_the_road.keys())

    tree = {}
    for a in acronyms:
        if a in end_roads:
            a = end_of_the_road[a]
        tree = navigate_tree(a, tree, acronyms)

    lookup = {}
    # Go from bottom up so if the parents will take into account new averages of children
    for k, v in reversed(tree.items()):
        isin, _ = ismember(acronyms, np.array(k))
        if np.sum(isin) == 1:
            lookup[k] = values[isin][0]
        else:
            isin, _ = ismember(acronyms, np.array(v))
            if np.sum(isin) > 0:
                val = np.mean(values[isin])
                lookup[k] = val
                # We need to add these into the acronyms so that they are considered when we sum up the tree
                acronyms = np.r_[acronyms, np.array(k, dtype=object)]
                values = np.r_[values, val]

    inverse_tree = {}
    for key, val in tree.items():
        if inverse_tree.get(key, None) is None:
            inverse_tree[key] = key
        for v in val:
            if inverse_tree.get(v, None) is None:
                inverse_tree[v] = key

    json_all = {}
    for key, val in inverse_tree.items():
        json_all[key] = lookup.get(key, lookup.get(val, json_all.get(val, {})))

    json_final = {}
    for key, val in json_all.items():
        if key in problems:
            json_final[problem_inverse_map[key]] = val
        if key in volume_acronyms and json_final.get(key, None) is None:
            json_final[key] = val

    return json_all, json_final