"""Shared display-unit metadata for ephys atlas features.

The main source of truth is the ibleatools feature schema:
https://github.com/int-brain-lab/ibleatools/blob/27839bdc55ae684d19e1c6a54dc2a683c30b61cf/src/ephysatlas/features.py

Most mappings below come directly from `raw_unit` / `transformed_unit` schema
metadata there. A few are simple display inferences from schema field names or
descriptions, notably `*_time_secs -> s`.
"""

EPHYS_FEATURE_UNITS = {
    "alpha_mean": "N/A",
    "alpha_std": "N/A",
    "aperiodic_exponent": "dB rel. V**2/Hz",
    "aperiodic_offset": "dB rel. V**2/Hz",
    "cor_ratio": "dimensionless",
    "decay_fit_error": "dB rel. V**2/Hz",
    "decay_fit_r_squared": "dimensionless",
    "decay_n_peaks": "count",
    "peak_time_secs": "s",
    "polarity": "dimensionless",
    "psd_alpha": "dB rel. V**2/Hz",
    "psd_alpha_csd": "dB rel. V**2/Hz",
    "psd_beta": "dB rel. V**2/Hz",
    "psd_beta_csd": "dB rel. V**2/Hz",
    "psd_delta": "dB rel. V**2/Hz",
    "psd_delta_csd": "dB rel. V**2/Hz",
    "psd_gamma": "dB rel. V**2/Hz",
    "psd_gamma_csd": "dB rel. V**2/Hz",
    "psd_lfp": "dB rel. V**2/Hz",
    "psd_lfp_csd": "dB rel. V**2/Hz",
    "psd_residual_alpha": "dB rel. V**2/Hz",
    "psd_residual_beta": "dB rel. V**2/Hz",
    "psd_residual_delta": "dB rel. V**2/Hz",
    "psd_residual_gamma": "dB rel. V**2/Hz",
    "psd_residual_lfp": "dB rel. V**2/Hz",
    "psd_residual_theta": "dB rel. V**2/Hz",
    "psd_theta": "dB rel. V**2/Hz",
    "psd_theta_csd": "dB rel. V**2/Hz",
    "recovery_time_secs": "s",
    "rms_ap": "dB rel. V",
    "rms_lf": "dB rel. V",
    "rms_lf_csd": "dB rel. V",
    "spike_count": "log2 count",
    "spike_rate": "Hz",
    "tip_time_secs": "s",
    "trough_time_secs": "s",
}


EPHYS_CLUSTER_FEATURE_UNITS = {
    "amp_max": "V",
    "amp_min": "V",
    "amp_median": "V",
    "amp_std_dB": "dB",
    "contamination": "fraction",
    "contamination_alt": "fraction",
    "drift": "um/h",
    "missed_spikes_est": "fraction",
    "noise_cutoff": "a.u.",
    "presence_ratio": "fraction",
    "presence_ratio_std": "count",
    "slidingRP_viol": "fraction",
    "spike_count": "count",
    "firing_rate": "Hz",
}


def get_ephys_feature_unit(fname):
    return EPHYS_FEATURE_UNITS.get(fname, None)


def get_ephys_cluster_feature_unit(fname):
    return EPHYS_CLUSTER_FEATURE_UNITS.get(fname, None)
