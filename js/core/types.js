/**
 * @typedef {Object.<string, FeatureTreeNode | string>} FeatureTreeNode
 */

/**
 * @typedef {Object} BucketFeatureMetadata
 * @property {string | null | undefined} [short_desc]
 * @property {string | null | undefined} [long_desc]
 * @property {string | null | undefined} [unit]
 */

/**
 * @typedef {Object} BucketMetadata
 * @property {string} uuid
 * @property {string | null | undefined} [alias]
 * @property {string | null | undefined} [url]
 * @property {FeatureTreeNode | null | undefined} [tree]
 * @property {string[] | null | undefined} [volumes]
 * @property {string | null | undefined} [short_desc]
 * @property {string | null | undefined} [long_desc]
 * @property {string | null | undefined} [last_access_date]
 */

/**
 * @typedef {Object} BucketResponse
 * @property {Object.<string, BucketFeatureMetadata>} features
 * @property {BucketMetadata} metadata
 */

/**
 * @typedef {Object} RegionRecord
 * @property {number} idx
 * @property {number} atlas_id
 * @property {string} acronym
 * @property {string} name
 * @property {string} hex
 * @property {boolean} [leaf]
 * @property {boolean} [fiber_or_vent]
 */

/**
 * @typedef {Object.<string, number | null>} FeatureStatisticValues
 */

/**
 * @typedef {Object.<string, FeatureStatisticValues>} FeatureStatisticsById
 */

/**
 * @typedef {Object} FeatureMappingData
 * @property {FeatureStatisticsById} data
 * @property {Object.<string, {min: number, max: number}>} statistics
 */

/**
 * @typedef {Object} FeatureHistogram
 * @property {number} [vmin]
 * @property {number} [vmax]
 */

/**
 * @typedef {Object} DecodedVolumeArray
 * @property {number[]} shape
 * @property {boolean} fortran_order
 * @property {ArrayLike<number>} data
 * @property {[number, number]} [bounds]
 */

/**
 * @typedef {Object} VolumePayloadEntry
 * @property {DecodedVolumeArray} [volume]
 * @property {[number, number]} [bounds]
 */

/**
 * @typedef {Object.<string, VolumePayloadEntry>} VolumePayloadMap
 */

/**
 * @typedef {Object} FeaturePayload
 * @property {Object.<string, FeatureMappingData>} [mappings]
 * @property {FeatureHistogram | null} [histogram]
 * @property {string | null | undefined} [cmap]
 * @property {VolumePayloadMap | null} [volumes]
 */

/**
 * @typedef {Object} AppStateShape
 * @property {string} bucket
 * @property {string[]} buckets
 * @property {string | null | undefined} fname
 * @property {boolean | null | undefined} isVolume
 * @property {string} stat
 * @property {string} mapping
 * @property {string} cmap
 * @property {number} cmapmin
 * @property {number} cmapmax
 * @property {boolean} logScale
 * @property {number} coronal
 * @property {number} sagittal
 * @property {number} horizontal
 * @property {number} exploded
 * @property {number | null} highlighted
 * @property {Set<number>} selected
 * @property {boolean | undefined} panelOpen
 * @property {string | undefined} [search]
 */

/**
 * @typedef {Object} SliceEventPayload
 * @property {"coronal" | "horizontal" | "sagittal" | "top" | "swanson"} axis
 * @property {number} idx
 */

/**
 * @typedef {Object} FeatureEventPayload
 * @property {string} fname
 * @property {boolean | undefined} isVolume
 */

/**
 * @typedef {Object} BucketEventPayload
 * @property {string} uuid_or_alias
 */

/**
 * @typedef {Object} HighlightEventPayload
 * @property {number | null} idx
 * @property {PointerEvent | MouseEvent | null} e
 */
