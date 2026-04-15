export {
    ALIAS_STATES,
    DEFAULT_BUCKET,
    DEFAULT_BUCKETS,
    DEFAULT_COLORMAP,
    DEFAULT_COLORMAP_MAX,
    DEFAULT_COLORMAP_MIN,
    DEFAULT_EXPLODED,
    DEFAULT_HIGHLIGHTED,
    DEFAULT_LOG_SCALE,
    DEFAULT_MAPPING,
    DEFAULT_SEARCH,
    DEFAULT_STAT,
};

const DEFAULT_COLORMAP = "magma";
const DEFAULT_COLORMAP_MIN = 0;
const DEFAULT_COLORMAP_MAX = 100;
const DEFAULT_LOG_SCALE = false;

const DEFAULT_BUCKET = "ephys";
const DEFAULT_BUCKETS = ["ephys", "bwm", "local"];
const DEFAULT_STAT = "mean";
const DEFAULT_EXPLODED = 0;

const DEFAULT_MAPPING = "allen";
const DEFAULT_SEARCH = "";
const DEFAULT_HIGHLIGHTED = null;

const ALIAS_STATES = {
    "bwm_choice": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxPclJkIiwiY21hcG1pbiI6MCwiY21hcG1heCI6MTAwLCJsb2dTY2FsZSI6ZmFsc2UsImZuYW1lIjoiY2hvaWNlX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    //    "bwm_block": {
    //        "bucket": "bwm",
    //        "state": "eyJjbWFwIjoiUHVycGxlcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImJsb2NrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6WzEzNDZdLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    //    },
    "bwm_feedback": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiUmVkcyIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6ImZlZWRiYWNrX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    "bwm_stimulus": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiWWxHbiIsImNtYXBtaW4iOjAsImNtYXBtYXgiOjEwMCwibG9nU2NhbGUiOmZhbHNlLCJmbmFtZSI6InN0aW11bHVzX2RlY29kaW5nX2VmZmVjdCIsImlzVm9sdW1lIjpmYWxzZSwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJiZXJ5bCIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInBhbmVsT3BlbiI6ZmFsc2UsInRvcCI6MCwic3dhbnNvbiI6MCwic2VhcmNoIjoiIn0"
    },
    "bwm": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoibWFnbWEiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiIiLCJpc1ZvbHVtZSI6bnVsbCwic3RhdCI6Im1lYW4iLCJjb3JvbmFsIjo2NjAsInNhZ2l0dGFsIjo1NTAsImhvcml6b250YWwiOjQwMCwiZXhwbG9kZWQiOjAsIm1hcHBpbmciOiJhbGxlbiIsImhpZ2hsaWdodGVkIjpudWxsLCJzZWxlY3RlZCI6W10sInRvcCI6MCwic3dhbnNvbiI6MH0"
    },
    "bwm_wheel_speed": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF9zcGVlZF9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
    "bwm_wheel_velocity": {
        "bucket": "bwm",
        "state": "eyJjbWFwIjoiQmx1ZXMiLCJjbWFwbWluIjowLCJjbWFwbWF4IjoxMDAsImxvZ1NjYWxlIjpmYWxzZSwiZm5hbWUiOiJ3aGVlbF92ZWxvY2l0eV9kZWNvZGluZ19lZmZlY3QiLCJpc1ZvbHVtZSI6ZmFsc2UsInN0YXQiOiJtZWFuIiwiY29yb25hbCI6NjYwLCJzYWdpdHRhbCI6NTUwLCJob3Jpem9udGFsIjo0MDAsImV4cGxvZGVkIjowLCJtYXBwaW5nIjoiYmVyeWwiLCJoaWdobGlnaHRlZCI6bnVsbCwic2VsZWN0ZWQiOltdLCJwYW5lbE9wZW4iOmZhbHNlLCJ0b3AiOjAsInN3YW5zb24iOjAsInNlYXJjaCI6IiJ9"
    },
};
