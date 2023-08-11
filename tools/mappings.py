import pandas as pd
import numpy as np
from pathlib import Path
from ibllib.atlas.regions import BrainRegions
from iblutil.numerical import ismember
import unittest
import time


def get_info_dataframe(save=True):
    def _get_end_nodes(br, volume_acronyms):
        end_nodes = {}
        for a in br.acronym[:br.n_lr]:
            if a not in volume_acronyms:
                continue

            desc = br.descendants(br.acronym2id(a))
            if len(desc['acronym']) > 1:
                isin = []
                for d in desc['acronym'][1:]:
                    if d in volume_acronyms:
                        isin.append(d)
                if len(isin) == 0:
                    for d in desc['acronym'][1:]:
                        end_nodes[d] = a

        return end_nodes

    from ibllib.atlas import AllenAtlas
    from ibllib.atlas.flatmaps import swanson_json
    ba = AllenAtlas(10)
    br = ba.regions
    data = {}
    # Get the set of acronyms that are included in the Allen volume
    idx_allen = np.unique(ba.label)
    data['in_allen'] = np.unique(br.acronym[idx_allen])
    # Get the regions that are at the end of the trees with no voxels
    data['end_nodes_allen'] = _get_end_nodes(br, data['in_allen'])

    # Get the set of acronyms that are included in the Swanson map
    idx_swanson = np.unique([s['thisID'] for s in swanson_json(remap=True)])
    data['in_swanson'] = np.unique(br.acronym[idx_swanson])
    # Get the regions that are at the end of the trees with no voxels
    data['end_nodes_swanson'] = _get_end_nodes(br, data['in_swanson'])

    # Get the regions that act as both a node and a leaf, e.g CB, HY, TH
    data['node_and_leaf'] = []
    for a in data['in_allen']:
        desc = br.descendants(br.acronym2id(a))
        if len(desc['id']) > 1:
            a, b = ismember(desc['acronym'][1:], data['in_allen'])
            if np.sum(a) > 0:
                data['node_and_leaf'].append(desc['acronym'][0])

    data['node_and_leaf_acronyms'] = {d: d+'-lf' for d in data['node_and_leaf']}
    data['node_and_leaf_levels'] = {d: br.get(br.acronym2id(d))['level'][0] + 1 for d in data['node_and_leaf']}
    # 5000 -> 5028 are not allen ids so we can assign these to the extra regions
    data['node_and_leaf_ids'] = {d: 5000 + i for i, d in enumerate(data['node_and_leaf'])}
    isin, _ = ismember(np.array(list(data['node_and_leaf_ids'].values())), br.id)
    assert np.sum(isin) == 0

    df = pd.DataFrame()
    full_acronyms = br.acronym[:br.n_lr]
    df['acronyms'] = full_acronyms
    for key, vals in data.items():
        if type(vals) is dict:
            ch = np.array(list(vals.keys()))
            pa = np.array(list(vals.values()))
            isin, iloc = ismember(full_acronyms, ch)
            df.loc[isin, key] = pa[iloc]
        else:
            isin, _ = ismember(full_acronyms, vals)
            df[key] = isin

    if save:
        df.to_parquet(Path(__file__).parent.joinpath('region_info.pqt'))

def read_region_info():
    return pd.read_parquet(Path(__file__).parent.joinpath('region_info.pqt'))

def read_region_tree():
    return pd.read_parquet(Path(__file__).parent.joinpath('region_tree.pqt'))


class RegionMapper:
    def __init__(self, regions, values, hemisphere=None, map_nodes=False):
        """
        Class to map array of regions and values to Allen, Swanson, Beryl (IBL) and Cosmos (IBL) mappings
        :param regions: np.array of Allen acronyms or atlas ids
        :param values: np.array of values corresponding to each Allen region
        :param hemisphere: When providing acronyms, the hemisphere of the values must be give, either 'left' or 'right'
        :param map_nodes: Some Allen regions act as both a node and a leaf in the Allen structure tree (e.g HY, TH), i.e
        they act as parents to other regions but also contain voxels in the annotation volume. If map_nodes=False, these
        regions are considered as nodes in the tree and their value will be propagated down the hierachy. If map_nodes=True,
        they will be considered as a leaf node underneath their region.
        """
        self.br = BrainRegions()
        self.df = pd.read_parquet(Path(__file__).parent.joinpath('region_info.pqt'))
        self.regions = np.array(regions)
        self.values = np.array(values)
        self.hemisphere = hemisphere

        assert self.regions.size == self.values.size, "Regions and values must have the same size"

        # Get the node and leaf map variables
        self.df_nl = self.df[self.df['node_and_leaf'] == 1]
        self.nl_map, self.nl_inverse_map, self.nl_ids_inverse_map = self._get_node_and_leaf_maps()
        self.nl_acronyms = self.df_nl.acronyms.values
        self.nl_ids = np.r_[self.br.acronym2id(self.nl_acronyms), -1 * self.br.acronym2id(self.nl_acronyms)]
        self.nl_map_acronyms = self.df_nl.node_and_leaf_acronyms.values
        self.nl_map_ids = np.r_[self.df_nl.node_and_leaf_ids.values, -1 * self.df_nl.node_and_leaf_ids.values]

        # Get the structure tree with descendents
        tree = read_region_tree()
        # if tree is None:
        #     tree = self.get_tree_dataframe()
        self.tree_level_1, self.tree_level_n = self._get_tree(tree)

        # Validate the regions and check it they are acronyms or atlas ids
        self.is_acronym = self._validate_regions()
        if self.is_acronym:
            self.regions = np.asarray(self.regions, dtype=object)
            assert self.hemisphere, 'When providing acronyms must pass in a hemisphere to display on'

        if map_nodes:
            self.regions = self.map_nodes_to_leaves()

    def _validate_regions(self):
        """
        Checks whether the regions provided are Allen acronyms or atlas ids. Ensures all regions given are
        contained in the Allen structure tree
        :return: bool, whether regions are acronyms or not
        """
        if np.issubdtype(self.regions.dtype, np.str_) or np.issubdtype(self.regions.dtype, object):
            isin, _ = ismember(self.regions, np.r_[self.br.acronym[:self.br.n_lr], self.nl_map_acronyms])
            assert all(isin), f'The acronyms: {", ".join(self.regions[~isin])}, are not in the Allen annotation tree'
            is_acronym = True
        else:
            isin, _ = ismember(self.regions, np.r_[self.br.id, self.nl_map_ids])
            assert all(isin), f'The atlas ids: {", ".join([str(s) for s in self.regions[~isin]])}, ' \
                              f'are not in the Allen annotation tree'
            is_acronym = False

        return is_acronym

    def _get_node_and_leaf_maps(self):
        """
        Computes set of mappings for the regions that act both as a node and a leaf. Contains forward mapping
        between the regions (e.g) and their newly assigned leaf acronyms (e.g HY-lf), the inverse of this mapping
        and also the mapping between the atlas ids, which are lateralised.
        :return:
        """
        forward_map = {}
        inverse_map = {}
        inverse_map_ids = {}
        for _, d in self.df_nl.iterrows():
            forward_map[d['acronyms']] = {'acronym': d['node_and_leaf_acronyms'],
                                          'levels': d['node_and_leaf_levels']}
            inverse_map[d['node_and_leaf_acronyms']] = d['acronyms']

            inverse_map_ids[d['node_and_leaf_ids']] = self.br.acronym2id(d['acronyms'])[0]
            inverse_map_ids[-1 * d['node_and_leaf_ids']] = -1 * self.br.acronym2id(d['acronyms'])[0]

        return forward_map, inverse_map, inverse_map_ids

    def _get_tree(self, tree):
        tree_level_1 = {}
        tree_level_n = {}
        for index, vals in tree.iterrows():
            tree_level_1[index] = vals.level_1
            tree_level_n[index] = vals.level_n

        # Add in the leaf node regions
        for lf in list(self.nl_inverse_map.keys()):
            tree_level_1[lf] = [lf]
            tree_level_n[lf] = np.array([], dtype=object)

        return tree_level_1, tree_level_n

    def get_tree_dataframe(self, save=True):
        """
        Compute dataframe required for navigating down the tree
        :param save:
        :return:
        """

        tree_level_1 = self._navigate_tree('root', {}, ['root'])
        tree_level_n = {}
        for a in list(tree_level_1.keys()):
            desc = self.br.descendants(self.br.acronym2id(a))['acronym'][1:]
            tree_level_n[a] = desc

        df = pd.DataFrame()
        df.index = list(tree_level_1.keys())
        df['level_1'] = list(tree_level_1.values())
        df['level_n'] = list(tree_level_n.values())

        if save:
            df.to_parquet(Path(__file__).parent.joinpath('region_tree.pqt'))

        return df

    def _navigate_tree(self, acronym, tree, all_acronyms):
        """
        For a given acronym constructs the hierachy tree of all it's children
        :param acronym: acronym to construct tree from
        :param tree: tree dict to add information to
        :param all_acronyms: list of acronyms to consider when constructing tree
        :return:
        """

        exists = tree.get(acronym, None)
        if exists is not None:
            return tree

        if acronym in self.nl_map_acronyms:
            return tree

        desc = self.br.descendants(self.br.acronym2id(acronym))
        if len(desc['id']) == 1:
            tree[acronym] = np.array([acronym], dtype=object)
        else:
            level = desc['level'] - desc['level'][0]
            acr = desc['acronym'][np.where(level == 1)[0]]
            extra = self.nl_map.get(acronym, None)
            if extra is not None:
                acr = np.r_[acr, np.array(extra['acronym'])]

            tree[acronym] = acr
            for a in acr:
                tree = self._navigate_tree(a, tree, all_acronyms)

        return tree

    def map_nodes_to_leaves(self):
        """
        For the regions that act both as a node and a leaf, this function converts the regions from nodes to leaves.
        If a conversion is already detected, the regions will be returned unchanged
        :return:
        """
        if self.is_acronym:
            isin, _ = ismember(self.regions, self.nl_map_acronyms)
            if np.sum(isin) > 0:
                print('Looks like we have already remapped')
            else:
                isin, iloc = ismember(self.regions, self.nl_acronyms)
                if np.sum(isin) > 0:
                    self.regions[isin] = self.nl_map_acronyms[iloc]
        else:
            isin, _ = ismember(self.regions, self.nl_map_ids)
            if np.sum(isin) > 0:
                print('Looks like we have already remapped')
            else:
                isin, iloc = ismember(self.regions, self.nl_ids)
                if np.sum(isin) > 0:
                    self.regions[isin] = self.nl_map_ids[iloc]

        return self.regions

    def map_regions(self, as_acronyms=False):
        """
        Main function to call to map the regions and values to the Allen, Swanson Beryl and Cosmos mappings
        :return: dict containing data for Allen, Beryl and Cosmos mappings (swanson info is incorporates in each mapping)
        """
        if self.is_acronym:
            index_a, values_a = self.map_acronyms_to_allen()
            index_b, values_b = self.map_to_beryl()
            index_c, values_c = self.map_to_cosmos()
        else:
            index_a, values_a = self.map_ids_to_allen()
            index_b, values_b = self.map_to_beryl()
            index_c, values_c = self.map_to_cosmos()

        if as_acronyms:
            index_a = self.br.acronym[index_a]
            index_b = self.br.acronym[index_b]
            index_c = self.br.acronym[index_c]

        data = dict()
        data['allen'] = {'index': index_a, 'values': values_a}
        data['beryl'] = {'index': index_b, 'values': values_b}
        data['cosmos'] = {'index': index_c, 'values': values_c}

        return data

    def map_acronyms_to_allen(self, regions=None, values=None, hemisphere=None):
        """
        Maps a list of acronyms to Allen regions. If regions and values not provided,
        uses region and value data stored in the class.
        :param regions: np.array of allen acronyms
        :param values: np.array of values associated to each acronym
        :param hemisphere: hemisphere of the acronyms
        :return: np.array of Allen index, np.array of values for each index
        """
        hemisphere = self.hemisphere if hemisphere is None else hemisphere
        regions = self.regions if regions is None else regions
        values = self.values if values is None else values
        if 'void' in regions:
            void_idx = np.where(regions == 'void')[0]
            regions = np.delete(regions, void_idx)
            values = np.delete(values, void_idx)
        allen = self._map_to_allen(regions, values)
        swanson = self._map_to_swanson(regions, values)

        index = np.array([], dtype=int)
        vals = np.array([])
        if len(allen) > 0:
            index = np.r_[index, np.vstack(self.br.acronym2index(np.array(list(allen.keys())),
                                                                 hemisphere=hemisphere)[1])[:, 0]]
            vals = np.r_[vals, np.array(list(allen.values()))]
        if len(swanson) > 0:
            index = np.r_[index, np.vstack(self.br.acronym2index(np.array(list(swanson.keys())),
                                                                 hemisphere=hemisphere)[1])[:, 0]]
            vals = np.r_[vals, np.array(list(swanson.values()))]

        # Here we check if we have the duplicate regions in Allen and Swanson. If we do and the values
        # are not the same Allen takes priority
        un, ind, counts = np.unique(index, return_counts=True, return_index=True)
        duplicates = counts > 1
        for u in un[duplicates]:
            if swanson[self.br.acronym[int(u)]] != allen[self.br.acronym[int(u)]]:
                print(f'Values for {self.br.acronym[int(u)]} are not the same in Allen and Swanson, will'
                      f'take Allen value')
                swanson[self.br.acronym[int(u)]] = allen[self.br.acronym[int(u)]]

        index = index[ind]
        vals = vals[ind]

        return index, vals

    def map_ids_to_allen(self):
        """
        Maps array of atlas_ids to Allen regions. Uses region and value data stored in the class.
        Atlas ids are split by hemisphere, left < 0, right >=0
        :return: np.array of Allen index, np.array of values for each index
        """
        index_lr = np.array([], dtype=int)
        values_lr = np.array([])
        for idx, hem in zip([self.regions < 0, self.regions >= 0], ['left', 'right']):
            if np.sum(idx) > 0:
                regions = self.regions[idx]
                values = self.values[idx]
                if hem == 'left':
                    isin, iloc = ismember(regions, self.nl_map_ids[self.nl_map_ids < 0])
                else:
                    isin, iloc = ismember(regions, self.nl_map_ids[self.nl_map_ids > 0])

                regions = np.r_[self.br.id2acronym(regions[~isin]), self.nl_map_acronyms[iloc]]
                values = np.r_[values[~isin], values[isin]]
                index, vals = self.map_acronyms_to_allen(regions, values, hemisphere=hem)
                index_lr = np.r_[index_lr, index]
                values_lr = np.r_[values_lr, vals]

        return index_lr, values_lr

    def _map_to_allen(self, regions, values):
        """
        Maps an array of acronyms and values to the Allen mapping
        :param regions: array of Allen acronyms
        :param values: array of values corresponding to each acronym
        :return:
        """
        _, allen = self.navigate_regions(regions, values, mapping='Allen')
        return allen

    def _map_to_swanson(self, regions, values):
        """
        Maps an array of acronyms and values to the Swanson mapping
        :param regions: array of Allen acronyms
        :param values: array of values corresponding to each acronym
        :return:
        """
        _, swanson = self.navigate_regions(regions, values, mapping='Swanson')
        return swanson

    def map_to_beryl(self):
        """
        Maps the region and value data in the class to the Cosmos mapping
        :return:
        """
        return self._map_to_mapping('Beryl-lr')

    def map_to_cosmos(self):
        """
        Maps the region and value data in the class to the Cosmos mapping
        :return:
        """
        return self._map_to_mapping('Cosmos-lr')

    def _map_to_mapping(self, mapping):
        """
        Applies a given mapping to the region and value data in the class
        :param mapping: mapping to apply, 'Beryl-lr', 'Cosmos-lr'
        :return:
        """

        if self.is_acronym:
            isin, iloc = ismember(self.regions, self.nl_map_acronyms)
            if np.sum(isin) > 0:
                regions = self.regions[~isin]
                values = self.values[~isin]
                for r, v in zip(self.regions[isin], self.values[isin]):
                    regions = np.append(regions, self.nl_inverse_map[r])
                    values = np.append(values, v)
            else:
                regions = self.regions
                values = self.values
            regions = self.br.acronym2id(regions, mapping='Allen-lr', hemisphere=self.hemisphere)
        else:
            isin, iloc = ismember(self.regions, self.nl_map_ids)
            if np.sum(isin) > 0:
                regions = self.regions[~isin]
                values = self.values[~isin]
                for r, v in zip(self.regions[isin], self.values[isin]):
                    regions = np.append(regions, self.nl_ids_inverse_map[r])
                    values = np.append(values, v)
            else:
                regions = self.regions
                values = self.values

        mapped_ids = self.br.id2id(regions, mapping=mapping)
        isin, iloc = ismember(mapped_ids, self.br.id)

        mapped_df = pd.DataFrame({'regions': iloc, 'vals': values})
        mapped_vals = mapped_df.groupby('regions').mean()

        return mapped_vals.index.values, mapped_vals.vals.values

    def navigate_regions(self, acronyms, values, mapping='Allen'):
        """
        Function to map acronyms and values to the Allen or Swanson mappings
        :param acronyms: array of allen acronyms
        :param values: array of values corresponding to each acronym
        :param mapping: mapping to use 'Allen' or 'Swanson'
        :return:
        """
        mapping = str.lower(mapping)
        volume_acronyms = self.df[self.df[f'in_{mapping}'] == 1]['acronyms'].values
        df_end = self.df[~self.df[f'end_nodes_{mapping}'].isna()]
        end_nodes = {}
        for _, d in df_end.iterrows():
            end_nodes[d['acronyms']] = d[f'end_nodes_{mapping}']

        # Need to remove the non ones, then add them back in
        isin, _ = ismember(acronyms, self.nl_map_acronyms)
        if np.sum(isin) > 0:
            nl_acronyms = acronyms[isin]
            nl_values = values[isin]
            nl_levels = np.empty(nl_acronyms.shape)
            for i, w in enumerate(nl_acronyms):
                nl_levels[i] = self.nl_map[self.nl_inverse_map[w]]['levels']
            acronyms = np.delete(acronyms, np.where(isin)[0])
            values = np.delete(values, np.where(isin)[0])

        if acronyms.size > 0:
            index = np.vstack(self.br.acronym2index(acronyms)[1])[:, 0]
            levels = self.br.level[index]
        else:
            levels = np.array([])

        if np.sum(isin) > 0:
            acronyms = np.r_[acronyms, nl_acronyms]
            values = np.r_[values, nl_values]
            levels = np.r_[levels, nl_levels]

        # Sort the acronyms and values so that we deal with the ones with the lowest level first
        acronyms = acronyms[np.argsort(levels)]
        values = values[np.argsort(levels)]

        end_roads = list(end_nodes.keys())

        desc = np.array(acronyms)
        for a in acronyms:
            if a in end_roads:
                a = end_nodes[a]
            desc = np.r_[desc, self.tree_level_n[a], np.array(a, dtype=object)]
        desc = np.unique(desc)

        tree = {}
        for k, v in self.tree_level_1.items():
            if k in desc:
                tree[k] = v

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

        all_regions = {}
        for key, val in inverse_tree.items():
            all_regions[key] = lookup.get(key, lookup.get(val, all_regions.get(val, {})))

        vol_regions = {}
        for key, val in all_regions.items():
            if key in self.nl_map_acronyms:
                if self.nl_inverse_map[key] in volume_acronyms:
                    vol_regions[self.nl_inverse_map[key]] = val
            if key in volume_acronyms and vol_regions.get(key, None) is None:
                vol_regions[key] = val

        return all_regions, vol_regions


class TestNavigateRegions(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.br = BrainRegions()

    def test_allen(self):
        # Test 1
        acronyms = np.array(['MOp1', 'MOs5'])
        values = np.array([1, 2])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. json_all to be the same as json_final as both regions are in volume
        assert json_all == json_final
        # 2. json_final and json_all to contain two regions
        assert len(json_final) == len(json_all) == 2
        # 3. MOp1 and MOs5 with the values assigned
        assert json_final['MOp1'] == 1
        assert json_final['MOs5'] == 2

        # Test 2
        acronyms = np.array(['MO', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. json_all to contain additional keys MO, MO1, MO2/3, MO5, MO6a and MO6b compared to json_final as these
        #    regions aren't in the volume
        compare = np.array(['MO', 'MO1', 'MO2/3', 'MO5', 'MO6a', 'MO6b'])
        isin, _ = ismember(np.array(list(json_all.keys())), compare)
        assert np.sum(isin) == len(compare)
        isin, _ = ismember(np.array(list(json_final.keys())), compare)
        assert np.sum(isin) == 0
        # 2. Value of MO to propagate down to MOs and MO1, MO2/3, MO5, MO6a and MO6b
        compare = np.r_[compare, self.br.descendants(self.br.acronym2id('MOs'))['acronym']]
        assert all([json_all[c] == 1 for c in compare])
        # 3. MOp to be assigned np.mean(MOp5, MOp1) and this to be propagated down to MOp2/3, MOp6a, MOp6b
        assert json_all['MOp'] == np.mean(values[1:])
        compare = np.array(['MOp2/3', 'MOp6a', 'MOp6b'])
        assert all([json_final[c] == np.mean(values[1:]) for c in compare])
        # 4. MOp5 and MOp1 will be given their assigned values
        assert json_final['MOp5'] == 2
        assert json_final['MOp1'] == 3

        # Test 3
        acronyms = np.array(['HY', 'PVZ', 'ADP', 'AHA'])
        values = np.array([1, 2, 3, 4])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='allen')
        # 1. All PVZ and all it's children are given value of PVZ
        acr = self.br.descendants(self.br.acronym2id('PVZ'))['acronym']
        assert all(json_all[a] == 2 for a in acr)
        # 2. Check that NC which is not in the volume is in json_all but not json_final
        assert json_all['NC'] == 2
        assert json_final.get('NC', None) is None
        # 3. Check that PVR is the mean value of ADP and AHA
        pvr_val = np.mean(values[-2:])
        assert json_all['PVR'] == pvr_val
        # 4. Check that children of PVR except ADP and AHA have the same value as PVR
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        acr = np.delete(acr, np.where(np.isin(acr, ['ADP', 'AHA']))[0])
        assert all([json_all[a] == pvr_val for a in acr])
        # 5. Check ADP and AHA have the expected value
        assert json_all['ADP'] == 3
        assert json_all['AHA'] == 4
        # 6. But AHA is not in the final json as not in the volume
        assert json_final.get('AHA', None) is None

        # Test 4
        acronyms = np.array(['FF', 'A13', 'PSTN', 'HY'])
        values = np.array([1, 2, 3, 4])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. Check that ZI has been given the average value of FF and A13
        assert json_all['ZI'] == np.mean(values[:2])
        # 2. Check that LZ has been given the mean value of ZI and PSTN, note not of PSTN, FF and A13
        assert json_all['LZ'] == np.mean([3, json_all['ZI']])
        assert json_all['LZ'] != np.mean(values[:3])
        # 3. Check that other children of LZ have the same value of LZ, but PSTN has its own value
        assert json_all['LPO'] == json_all['LZ']
        assert json_all['PSTN'] == 3
        # 4. Check that other children of HY have same value as HY
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        assert all([json_all[a] == 4 for a in acr])

        # Test 5
        # Now we need to look at the case where we have HY-lf and this behaviour
        acronyms = np.array(['HY', 'HY-lf', 'ME'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. In json_all, we expect each to have its own value with same name
        assert json_all['HY'] == 1
        assert json_all['HY-lf'] == 2
        assert json_all['ME'] == 3
        # 2. In json_final we expect HY to be replaced by the value for HY-lf
        assert json_final['HY'] == json_all['HY-lf'] == 2
        # 3. We expect all the other children in the tree to take the value for HY
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        assert all([json_all[a] == 1 for a in acr])

        # Test 6
        acronyms = np.array(['HY-lf', 'ZI-lf'])
        values = np.array([1, 2])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. In json_all they are just given the values
        assert json_all['HY-lf'] == 1
        assert json_all['ZI-lf'] == 2
        # 2. In json_final they are moved to HY and ZI respectively
        assert json_final.get('HY-lf', None) is None
        assert json_final.get('ZI-lf', None) is None
        assert json_final['HY'] == json_all['HY-lf'] == 1
        assert json_final['ZI'] == json_all['ZI-lf'] == 2

        # Test 7
        acronyms = np.array(['FF', 'A13', 'ZI-lf', 'HY', 'PSTN'])
        values = np.array([1, 2, 3, 4, 5])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. In json_all ZI should have mean value of FF, A13 and ZI-lf
        assert json_all['ZI'] == np.mean(values[:3])
        # 2. In json_all LZ should have mean value of ZI and PSTN
        assert json_all['LZ'] == np.mean(np.r_[np.mean(values[:3]), 5])
        # 3. In json_final ZI should have value of ZI-lf, FF should have value of FF
        assert json_final['ZI'] == 3
        assert json_final['FF'] == 1
        # 4. In json_final LHA should have value of LZ in json_all
        assert json_final['LHA'] == json_all['LZ']
        # 5. Other children of HY should have this value
        assert json_final['HY'] == 4
        assert json_final['MPO'] == 4

        # Test 8. These ones are at the end of the road
        acronyms = np.array(['PVHap', 'PVHpv', 'PVHm', 'SO', 'HY'])
        values = np.array([1, 2, 3, 4, 5])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Allen')
        # 1. The parent PVHp of PVHap and PVHpv should take the average value
        assert json_all['PVHp'] == np.mean(values[:2])
        # 2. The parent PVH of PVHm and PVHp should take their average value
        pvh_val = np.mean(np.r_[np.mean(values[:2]), 3])
        assert json_all['PVH'] == pvh_val
        # 3. The parent PVZ of PVH and SO should be their average values
        assert json_all['PVZ'] == np.mean(np.r_[pvh_val, 4])
        # 3. Only PVH and SO are in json_final
        assert json_final.get('PVH', None) is not None
        assert json_final.get('PVHm', None) is None

    def test_swanson(self):
        # Test 1
        acronyms = np.array(['MOp1', 'MOs5'])
        values = np.array([1, 2])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. Value of MOp1 has been assigned to MOp and value of MOs5 to MOs
        assert json_final['MOp'] == 1
        assert json_final['MOs'] == 2

        # Test 2
        acronyms = np.array(['MO', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. json_all to contain additional keys MO, MO1, MO2/3, MO5, MO6a and MO6b compared to json_final as these
        #    regions aren't in the volume
        compare = np.array(['MO', 'MO1', 'MO2/3', 'MO5', 'MO6a', 'MO6b', 'MOp5', 'MOp1'])
        isin, _ = ismember(np.array(list(json_all.keys())), compare)
        assert np.sum(isin) == len(compare)
        isin, _ = ismember(np.array(list(json_final.keys())), compare)
        assert np.sum(isin) == 0
        # 2. Value of MO to propagate down to MOs
        assert json_final['MOs'] == values[0]
        # 3. MOp to be assigned np.mean(MOp5, MOp1)
        assert json_final['MOp'] == np.mean(values[1:])

        # Test 3
        acronyms = np.array(['HY', 'PVZ', 'ADP', 'AHA'])
        values = np.array([1, 2, 3, 4])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. All PVZ and all it's children are given value of PVZ
        acr = self.br.descendants(self.br.acronym2id('PVZ'))['acronym']
        assert all(json_all[a] == 2 for a in acr)
        # 2. Check that NC which is not in the volume is in json_all but not json_final
        assert json_all['NC'] == 2
        assert json_final.get('NC', None) is None
        # 3. Check that PVR is the mean value of ADP and AHA
        pvr_val = np.mean(values[-2:])
        assert json_all['PVR'] == pvr_val
        # 4. Check that children of PVR except ADP and AHA have the same value as PVR
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        acr = np.delete(acr, np.where(np.isin(acr, ['ADP', 'AHA']))[0])
        assert all([json_all[a] == pvr_val for a in acr])
        # 5. Check ADP and AHA have the expected value
        assert json_all['ADP'] == 3
        assert json_all['AHA'] == 4
        # 6. AHA is included in swanson
        assert json_final['AHA'] == 4

        # Test 4
        acronyms = np.array(['FF', 'A13', 'PSTN', 'HY'])
        values = np.array([1, 2, 3, 4])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. Check that ZI has been given the average value of FF and A13
        assert json_all['ZI'] == np.mean(values[:2])
        # 2. Check that LZ has been given the mean value of ZI and PSTN, note not of PSTN, FF and A13
        assert json_all['LZ'] == np.mean([3, json_all['ZI']])
        assert json_all['LZ'] != np.mean(values[:3])
        # 3. Check that other children of LZ have the same value of LZ, but PSTN has its own value
        assert json_all['LPO'] == json_all['LZ']
        assert json_all['PSTN'] == 3
        # 4. Check that other children of HY have same value as HY
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        assert all([json_all[a] == 4 for a in acr])
        # 5. Check that A13 is in Swanson mapping
        assert json_final['A13'] == 2

        # Test 5
        # Now we need to look at the case where we have HY-lf and this behaviour
        acronyms = np.array(['HY', 'HY-lf', 'ME'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. In json_all, we expect each to have its own value with same name
        assert json_all['HY'] == 1
        assert json_all['HY-lf'] == 2
        assert json_all['ME'] == 3
        # 2. In json_final we expect there to be no HY
        assert json_final.get('HY', None) is None
        # 3. We expect all the other children in the tree to take the value for HY
        acr = self.br.descendants(self.br.acronym2id('PVR'))['acronym']
        assert all([json_all[a] == 1 for a in acr])

        # Test 6
        acronyms = np.array(['HY-lf', 'ZI-lf'])
        values = np.array([1, 2])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        json_all, json_final = mapper.navigate_regions(acronyms, values, mapping='Swanson')
        # 1. In json_all they are just given the values
        assert json_all['HY-lf'] == 1
        assert json_all['ZI-lf'] == 2
        # 2. In json_final they are moved to HY and ZI respectively
        assert json_final.get('HY-lf', None) is None
        assert json_final.get('ZI-lf', None) is None
        assert json_final.get('HY', None) is None
        assert json_final['ZI'] == json_all['ZI-lf'] == 2


class TestMapValues(unittest.TestCase):
    def test_map_to_nodes_acronyms(self):
        # Case where there is no mapping
        acronyms = np.array(['HY', 'ZI', 'CB', 'MOs', 'VPM', 'AVPV'])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == np.array(['HY-lf', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV']))
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == np.array(['HY-lf', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV']))

        # Case where mapping already exists
        acronyms = np.array(['HY', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV'])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        new_acronyms = mapper.map_nodes_to_leaves()
        # new acronyms is unchanged
        assert all(new_acronyms == acronyms)
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == acronyms)

    def test_map_to_nodes_ids(self):
        # Case where there is no mapping
        acronyms = np.array([1097,  797,  512,  993,  733,  272])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values)
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == np.array([5003,  5019,  5000,  993,  733,  272]))
        mapper = RegionMapper(-1 * acronyms, values)
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == -1 * np.array([5003,  5019,  5000,  993,  733,  272]))

        # Case where mapping already exists
        acronyms = np.array([1097,  5019,  5000,  993,  733,  272])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values)
        new_acronyms = mapper.map_nodes_to_leaves()
        # new acronyms is unchanged
        assert all(new_acronyms == acronyms)
        mapper = RegionMapper(-1 * acronyms, values)
        new_acronyms = mapper.map_nodes_to_leaves()
        assert all(new_acronyms == -1 * acronyms)

    def test_hemisphere_requirement(self):
        # When passing acronyms, must pass in a hemisphere argument
        acronyms = np.array(['HY', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV'])
        values = np.arange(acronyms.size)
        with self.assertRaises(AssertionError) as context:
            RegionMapper(acronyms, values)

        self.assertTrue('hemisphere' in str(context.exception))

        # For ids, no need
        acronyms = np.array([5003, 5019, 5000, 993, 733, 272])
        _ = RegionMapper(acronyms, values)

    def test_validate_regions(self):
        # If we pass in acronyms
        acronyms = np.array(['HY', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV'])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        assert mapper.is_acronym

        # If we pass in a dud acronyms
        acronyms = np.array(['lala', 'ZI-lf', 'CB-lf', 'MOs', 'VPM', 'AVPV'])
        values = np.arange(acronyms.size)
        with self.assertRaises(AssertionError) as context:
            RegionMapper(acronyms, values, hemisphere='left')
        self.assertTrue('The acronyms: lala' in str(context.exception))

        # Now check with ids
        acronyms = np.array([5003,  5019,  5000,  993,  733,  272])
        values = np.arange(acronyms.size)
        mapper = RegionMapper(acronyms, values)
        assert not mapper.is_acronym

        acronyms = np.array([50003, 5019, 5000, 993, 733, 272])
        values = np.arange(acronyms.size)
        with self.assertRaises(AssertionError) as context:
            RegionMapper(acronyms, values, hemisphere='left')
        self.assertTrue('The atlas ids: 50003' in str(context.exception))


class TestAllenMappings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.br = BrainRegions()

    def test_acronyms(self):
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        # Left hemisphere
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_acronyms_to_allen()
        assert all(index > self.br.n_lr)
        assert all(['MO' in b for b in self.br.acronym[index]])

        # Right hemisphere
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_acronyms_to_allen()
        assert all(index <= self.br.n_lr)
        assert all(['MO' in b for b in self.br.acronym[index]])

        # Left hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_acronyms_to_allen()
        assert all(index > self.br.n_lr)
        assert all([b in ['TH', 'HY', 'MOp1', 'MOp'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_acronyms_to_allen()
        assert all(index <= self.br.n_lr)
        assert all([b in ['TH', 'HY', 'MOp1', 'MOp'] for b in self.br.acronym[index]])

    def test_atlas_ids(self):
        # Left hemisphere
        acronyms = np.array([-993, -648, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_ids_to_allen()
        assert all(index > self.br.n_lr)
        assert all(['MO' in b for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array([993, 648, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_ids_to_allen()
        assert all(index <= self.br.n_lr)
        assert all(['MO' in b for b in self.br.acronym[index]])

        # Left hemisphere
        acronyms = np.array([-5015, -5003, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_ids_to_allen()
        assert all(index > self.br.n_lr)
        assert all([b in ['TH', 'HY', 'MOp1', 'MOp'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array([5015, 5003, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_ids_to_allen()
        assert all(index <= self.br.n_lr)
        assert all([b in ['TH', 'HY', 'MOp1', 'MOp'] for b in self.br.acronym[index]])

    def test_atlas_ids_lateralised(self):
        acronyms = np.array([-993, -648, -320, 5015, 5003, 320])
        values = np.array([1, 2, 3, 4, 5, 6])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_ids_to_allen()
        assert all([a in index for a in self.br.id2index(320)[1][0]])
        assert self.br.acronym2index('HY', hemisphere='right')[1][0] in index
        assert self.br.id2index(-993, mapping='Allen-lr')[1][0] in index


class TestBerylMappings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.br = BrainRegions()

    def test_acronyms(self):
        # Left hemisphere
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_to_beryl()
        assert all(index > self.br.n_lr)
        assert all([b in ['MOs', 'MOp'] for b in self.br.acronym[index]])
        assert vals[self.br.acronym[index] == 'MOp'] == np.mean(values[1:])
        assert vals[self.br.acronym[index] == 'MOs'] == 1

        # Right hemisphere
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_to_beryl()
        assert all(index <= self.br.n_lr)
        assert all([b in ['MOs', 'MOp'] for b in self.br.acronym[index]])
        assert vals[self.br.acronym[index] == 'MOp'] == np.mean(values[1:])
        assert vals[self.br.acronym[index] == 'MOs'] == 1

        # Left hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_to_beryl()
        # root is weird
        assert all(index[index != 1] > self.br.n_lr)
        assert all([b in ['root', 'MOp'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_to_beryl()
        # root is weird
        assert all(index[index != 1] <= self.br.n_lr)
        assert all([b in ['root', 'MOp'] for b in self.br.acronym[index]])

    def test_atlas_ids(self):
        # Left hemisphere
        acronyms = np.array([-993, -648, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_beryl()
        assert all(index > self.br.n_lr)
        assert all([b in ['MOs', 'MOp'] for b in self.br.acronym[index]])
        assert vals[self.br.acronym[index] == 'MOp'] == np.mean(values[1:])
        assert vals[self.br.acronym[index] == 'MOs'] == 1

        # Right hemisphere
        acronyms = np.array([993, 648, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_beryl()
        assert all(index <= self.br.n_lr)
        assert all([b in ['MOs', 'MOp'] for b in self.br.acronym[index]])
        assert vals[self.br.acronym[index] == 'MOp'] == np.mean(values[1:])
        assert vals[self.br.acronym[index] == 'MOs'] == 1

        # Left hemisphere
        acronyms = np.array([-5015, -5003, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_beryl()
        # root is weird
        assert all(index[index != 1] > self.br.n_lr)
        assert all([b in ['root', 'MOp'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array([5015, 5003, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_beryl()
        # root is weird
        assert all(index[index != 1] <= self.br.n_lr)
        assert all([b in ['root', 'MOp'] for b in self.br.acronym[index]])

    def test_atlas_ids_lateralised(self):
        acronyms = np.array([-993, -648, -320, 5015, 5003, 320])
        values = np.array([1, 2, 3, 4, 5, 6])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_beryl()
        assert all([b in ['root', 'MOp', 'MOs'] for b in self.br.acronym[index]])
        # We have MOp for left and right hemisphere
        assert len(np.where(self.br.acronym[index] == 'MOp')[0]) == 2


class TestCosmosMappings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.br = BrainRegions()

    def test_acronyms(self):
        # Left hemisphere
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_to_cosmos()
        assert all(index > self.br.n_lr)
        assert all([b in ['Isocortex'] for b in self.br.acronym[index]])
        assert vals[0] == np.mean(values)

        # Right hemisphere
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_to_cosmos()
        assert all(index <= self.br.n_lr)
        assert all([b in ['Isocortex'] for b in self.br.acronym[index]])
        assert vals[0] == np.mean(values)

        # Left hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        index, vals = mapper.map_to_cosmos()
        assert all(index > self.br.n_lr)
        assert all([b in ['Isocortex', 'TH', 'HY'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array(['TH-lf', 'HY-lf', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='right')
        index, vals = mapper.map_to_cosmos()
        assert all(index <= self.br.n_lr)
        assert all([b in ['Isocortex', 'TH', 'HY'] for b in self.br.acronym[index]])

    def test_atlas_ids(self):
        # Left hemisphere
        acronyms = np.array([-993, -648, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_cosmos()
        assert all(index > self.br.n_lr)
        assert all([b in ['Isocortex'] for b in self.br.acronym[index]])
        assert vals[0] == np.mean(values)

        # Right hemisphere
        acronyms = np.array([993, 648, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_cosmos()
        assert all(index <= self.br.n_lr)
        assert all([b in ['Isocortex'] for b in self.br.acronym[index]])
        assert vals[0] == np.mean(values)

        # Left hemisphere
        acronyms = np.array([-5015, -5003, -320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_cosmos()
        assert all(index > self.br.n_lr)
        assert all([b in ['Isocortex', 'TH', 'HY'] for b in self.br.acronym[index]])

        # Right hemisphere
        acronyms = np.array([5015, 5003, 320])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_cosmos()
        assert all(index <= self.br.n_lr)
        assert all([b in ['Isocortex', 'TH', 'HY'] for b in self.br.acronym[index]])

    def test_atlas_ids_lateralised(self):
        acronyms = np.array([-993, -648, -320, 5015, 5003, 320])
        values = np.array([1, 2, 3, 4, 5, 6])
        mapper = RegionMapper(acronyms, values)
        index, vals = mapper.map_to_cosmos()
        assert all([b in ['Isocortex', 'TH', 'HY'] for b in self.br.acronym[index]])
        # We have Isocortex for left and right hemisphere
        assert len(np.where(self.br.acronym[index] == 'Isocortex')[0]) == 2


class TestFullProcess(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.br = BrainRegions()

    def test_process_regions(self):
        # Left hemisphere
        acronyms = np.array(['MOs', 'MOp5', 'MOp1'])
        values = np.array([1, 2, 3])
        mapper = RegionMapper(acronyms, values, hemisphere='left')
        data = mapper.map_regions()

        assert ['allen', 'beryl', 'cosmos'] == list(data.keys())
