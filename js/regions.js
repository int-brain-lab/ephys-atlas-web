const REGIONS = {
    "0": "void",
    "1": "root",
    "8": "FRP1",
    "9": "FRP2/3",
    "10": "FRP5",
    "11": "FRP6a",
    "20": "MOp1",
    "21": "MOp2/3",
    "22": "MOp5",
    "23": "MOp6a",
    "24": "MOp6b",
    "26": "MOs1",
    "27": "MOs2/3",
    "28": "MOs5",
    "29": "MOs6a",
    "30": "MOs6b",
    "46": "SSp-n1",
    "47": "SSp-n2",
    "48": "SSp-n4",
    "49": "SSp-n5",
    "50": "SSp-n6a",
    "51": "SSp-n6b",
    "53": "SSp-bfd1",
    "54": "SSp-bfd2",
    "55": "SSp-bfd4",
    "56": "SSp-bfd5",
    "57": "SSp-bfd6a",
    "58": "SSp-bfd6b",
    "67": "SSp-ll1",
    "68": "SSp-ll2",
    "69": "SSp-ll4",
    "70": "SSp-ll5",
    "71": "SSp-ll6a",
    "72": "SSp-ll6b",
    "74": "SSp-m1",
    "75": "SSp-m2",
    "76": "SSp-m4",
    "77": "SSp-m5",
    "78": "SSp-m6a",
    "79": "SSp-m6b",
    "81": "SSp-ul1",
    "82": "SSp-ul2",
    "83": "SSp-ul4",
    "84": "SSp-ul5",
    "85": "SSp-ul6a",
    "86": "SSp-ul6b",
    "88": "SSp-tr1",
    "89": "SSp-tr2",
    "90": "SSp-tr4",
    "91": "SSp-tr5",
    "92": "SSp-tr6a",
    "93": "SSp-tr6b",
    "95": "SSp-un1",
    "96": "SSp-un2",
    "97": "SSp-un4",
    "98": "SSp-un5",
    "99": "SSp-un6a",
    "100": "SSp-un6b",
    "103": "SSs2/3",
    "104": "SSs4",
    "105": "SSs5",
    "106": "SSs6a",
    "107": "SSs6b",
    "112": "GU5",
    "113": "GU6a",
    "119": "VISC5",
    "120": "VISC6a",
    "124": "AUDd1",
    "125": "AUDd2/3",
    "126": "AUDd4",
    "127": "AUDd5",
    "128": "AUDd6a",
    "129": "AUDd6b",
    "141": "AUDp5",
    "142": "AUDp6a",
    "147": "AUDpo4",
    "148": "AUDpo5",
    "149": "AUDpo6a",
    "150": "AUDpo6b",
    "155": "AUDv5",
    "156": "AUDv6a",
    "157": "AUDv6b",
    "166": "VISal1",
    "173": "VISam1",
    "174": "VISam2/3",
    "175": "VISam4",
    "176": "VISam5",
    "177": "VISam6a",
    "178": "VISam6b",
    "180": "VISl1",
    "181": "VISl2/3",
    "182": "VISl4",
    "183": "VISl5",
    "184": "VISl6a",
    "185": "VISl6b",
    "187": "VISp1",
    "188": "VISp2/3",
    "189": "VISp4",
    "190": "VISp5",
    "191": "VISp6a",
    "192": "VISp6b",
    "194": "VISpl1",
    "195": "VISpl2/3",
    "196": "VISpl4",
    "197": "VISpl5",
    "198": "VISpl6a",
    "201": "VISpm1",
    "202": "VISpm2/3",
    "203": "VISpm4",
    "204": "VISpm5",
    "205": "VISpm6a",
    "206": "VISpm6b",
    "208": "VISli1",
    "209": "VISli2/3",
    "210": "VISli4",
    "211": "VISli5",
    "212": "VISli6a",
    "213": "VISli6b",
    "215": "VISpor1",
    "216": "VISpor2/3",
    "217": "VISpor4",
    "218": "VISpor5",
    "219": "VISpor6a",
    "220": "VISpor6b",
    "229": "ACAd2/3",
    "230": "ACAd5",
    "231": "ACAd6a",
    "232": "ACAd6b",
    "234": "ACAv1",
    "235": "ACAv2/3",
    "236": "ACAv5",
    "237": "ACAv6a",
    "238": "ACAv6b",
    "240": "PL1",
    "242": "PL2/3",
    "243": "PL5",
    "244": "PL6a",
    "245": "PL6b",
    "247": "ILA1",
    "249": "ILA2/3",
    "250": "ILA5",
    "251": "ILA6a",
    "260": "ORBl1",
    "261": "ORBl2/3",
    "262": "ORBl5",
    "263": "ORBl6a",
    "266": "ORBm1",
    "268": "ORBm2/3",
    "269": "ORBm5",
    "270": "ORBm6a",
    "274": "ORBvl1",
    "275": "ORBvl2/3",
    "276": "ORBvl5",
    "277": "ORBvl6a",
    "283": "AId5",
    "284": "AId6a",
    "285": "AId6b",
    "287": "AIp1",
    "288": "AIp2/3",
    "289": "AIp5",
    "290": "AIp6a",
    "291": "AIp6b",
    "294": "AIv2/3",
    "295": "AIv5",
    "296": "AIv6a",
    "297": "AIv6b",
    "300": "RSPagl1",
    "301": "RSPagl2/3",
    "302": "RSPagl5",
    "303": "RSPagl6a",
    "304": "RSPagl6b",
    "327": "RSPd1",
    "328": "RSPd2/3",
    "330": "RSPd5",
    "331": "RSPd6a",
    "332": "RSPd6b",
    "334": "RSPv1",
    "336": "RSPv2/3",
    "337": "RSPv5",
    "338": "RSPv6a",
    "339": "RSPv6b",
    "348": "VISa1",
    "349": "VISa2/3",
    "350": "VISa4",
    "351": "VISa5",
    "352": "VISa6a",
    "353": "VISa6b",
    "355": "VISrl1",
    "356": "VISrl2/3",
    "357": "VISrl4",
    "358": "VISrl5",
    "359": "VISrl6a",
    "360": "VISrl6b",
    "363": "TEa2/3",
    "364": "TEa4",
    "365": "TEa5",
    "366": "TEa6a",
    "367": "TEa6b",
    "371": "PERI5",
    "372": "PERI6a",
    "377": "ECT5",
    "378": "ECT6a",
    "379": "ECT6b",
    "380": "OLF",
    "381": "MOB",
    "388": "AOBgl",
    "390": "AOBmi",
    "391": "AON",
    "400": "TTd",
    "406": "TTv",
    "411": "DP",
    "417": "PIR",
    "424": "NLOT1",
    "428": "COAa",
    "433": "COApl",
    "439": "COApm",
    "445": "PAA",
    "450": "TR",
    "455": "HPF",
    "458": "CA1",
    "463": "CA2",
    "468": "CA3",
    "475": "DG-mo",
    "476": "DG-po",
    "477": "DG-sg",
    "491": "FC",
    "492": "IG",
    "496": "ENTl1",
    "497": "ENTl2",
    "501": "ENTl3",
    "504": "ENTl5",
    "506": "ENTl6a",
    "509": "ENTm1",
    "510": "ENTm2",
    "513": "ENTm3",
    "515": "ENTm5",
    "517": "ENTm6",
    "524": "PAR",
    "528": "POST",
    "532": "PRE",
    "536": "SUB",
    "545": "ProS",
    "554": "HATA",
    "555": "APr",
    "556": "CTXsp",
    "558": "CLA",
    "560": "EPd",
    "561": "EPv",
    "562": "LA",
    "564": "BLAa",
    "565": "BLAp",
    "566": "BLAv",
    "568": "BMAa",
    "569": "BMAp",
    "570": "PA",
    "572": "STR",
    "574": "CP",
    "576": "ACB",
    "577": "FS",
    "578": "OT",
    "588": "LSc",
    "589": "LSr",
    "590": "LSv",
    "591": "SF",
    "592": "SH",
    "594": "AAA",
    "597": "CEAc",
    "598": "CEAl",
    "599": "CEAm",
    "600": "IA",
    "601": "MEA",
    "609": "PAL",
    "611": "GPe",
    "612": "GPi",
    "614": "SI",
    "615": "MA",
    "618": "MS",
    "619": "NDB",
    "620": "TRS",
    "622": "BST",
    "642": "TH",
    "645": "VAL",
    "646": "VM",
    "648": "VPL",
    "649": "VPLpc",
    "650": "VPM",
    "651": "VPMpc",
    "652": "PoT",
    "654": "SPFm",
    "655": "SPFp",
    "656": "SPA",
    "657": "PP",
    "660": "MGd",
    "661": "MGv",
    "662": "MGm",
    "664": "LGd-sh",
    "665": "LGd-co",
    "666": "LGd-ip",
    "669": "LP",
    "670": "PO",
    "671": "POL",
    "672": "SGN",
    "673": "Eth",
    "676": "AV",
    "678": "AMd",
    "679": "AMv",
    "681": "IAM",
    "682": "IAD",
    "683": "LD",
    "685": "IMD",
    "686": "MD",
    "690": "SMT",
    "691": "PR",
    "693": "PVT",
    "694": "PT",
    "695": "RE",
    "696": "Xi",
    "698": "RH",
    "699": "CM",
    "700": "PCN",
    "701": "CL",
    "702": "PF",
    "703": "PIL",
    "704": "RT",
    "706": "IGL",
    "707": "IntG",
    "708": "LGv",
    "711": "SubG",
    "713": "MH",
    "714": "LH",
    "716": "HY",
    "721": "PVH",
    "736": "ADP",
    "738": "AVP",
    "740": "DMH",
    "744": "MEPO",
    "745": "MPO",
    "748": "PS",
    "754": "SFO",
    "756": "VLPO",
    "758": "AHN",
    "764": "LM",
    "766": "Mmme",
    "767": "Mml",
    "771": "SUM",
    "777": "MPN",
    "783": "PVHd",
    "788": "VMH",
    "793": "PH",
    "795": "LHA",
    "796": "LPO",
    "799": "PeF",
    "801": "STN",
    "802": "TU",
    "803": "ZI",
    "805": "FF",
    "807": "MB",
    "810": "SCop",
    "811": "SCsg",
    "812": "SCzo",
    "814": "ICc",
    "815": "ICd",
    "816": "ICe",
    "817": "NB",
    "818": "SAG",
    "819": "PBG",
    "821": "SCO",
    "823": "SNr",
    "824": "VTA",
    "826": "RR",
    "827": "MRN",
    "832": "SCdg",
    "833": "SCdw",
    "834": "SCiw",
    "835": "SCig",
    "839": "PAG",
    "840": "PRC",
    "841": "INC",
    "842": "ND",
    "843": "Su3",
    "845": "APN",
    "846": "MPT",
    "847": "NOT",
    "848": "NPC",
    "849": "OP",
    "850": "PPT",
    "851": "RPF",
    "853": "CUN",
    "854": "RN",
    "855": "III",
    "856": "MA3",
    "857": "EW",
    "859": "Pa4",
    "860": "VTN",
    "861": "AT",
    "863": "DT",
    "864": "MT",
    "867": "SNc",
    "868": "PPN",
    "870": "IF",
    "874": "IPA",
    "875": "IPL",
    "877": "IPDM",
    "878": "IPDL",
    "880": "RL",
    "881": "CLI",
    "882": "DR",
    "884": "P",
    "886": "NLL",
    "890": "PSV",
    "891": "PB",
    "892": "KF",
    "904": "POR",
    "906": "SOCl",
    "909": "DTN",
    "911": "PDTg",
    "912": "PCG",
    "913": "PG",
    "914": "PRNc",
    "918": "SUT",
    "919": "TRN",
    "920": "V",
    "921": "P5",
    "923": "PC5",
    "924": "I5",
    "926": "CS",
    "929": "LC",
    "930": "LDT",
    "931": "NI",
    "932": "PRNr",
    "933": "RPO",
    "936": "MY",
    "942": "DCO",
    "943": "VCO",
    "945": "CU",
    "947": "ECU",
    "949": "NTS",
    "955": "SPVC",
    "956": "SPVI",
    "957": "SPVO",
    "963": "Pa5",
    "968": "VII",
    "969": "ACVII",
    "973": "AMBv",
    "974": "DMX",
    "976": "GRN",
    "977": "ICB",
    "978": "IO",
    "979": "IRN",
    "981": "LIN",
    "983": "LRNm",
    "985": "MARN",
    "987": "MDRNd",
    "988": "MDRNv",
    "989": "PARN",
    "990": "PAS",
    "992": "PGRNd",
    "993": "PGRNl",
    "997": "PRP",
    "1003": "LAV",
    "1004": "MV",
    "1005": "SPIV",
    "1006": "SUV",
    "1007": "x",
    "1008": "XII",
    "1009": "y",
    "1014": "RO",
    "1015": "CB",
    "1021": "LING",
    "1026": "CENT2",
    "1030": "CENT3",
    "1043": "CUL4 5",
    "1047": "DEC",
    "1051": "FOTU",
    "1055": "PYR",
    "1059": "UVU",
    "1063": "NOD",
    "1068": "SIM",
    "1073": "ANcr1",
    "1077": "ANcr2",
    "1081": "PRM",
    "1085": "COPY",
    "1089": "PFL",
    "1093": "FL",
    "1098": "FN",
    "1099": "IP",
    "1100": "DN",
    "1101": "VeCB",
    "1102": "fiber tracts",
    "1109": "lot",
    "1112": "aco",
    "1115": "bsc",
    "1116": "csc",
    "1118": "opt",
    "1121": "mlf",
    "1122": "pc",
    "1123": "IVn",
    "1128": "sV",
    "1130": "sptV",
    "1136": "vVIIIn",
    "1140": "das",
    "1141": "ll",
    "1143": "bic",
    "1160": "ml",
    "1173": "cbc",
    "1175": "scp",
    "1176": "dscp",
    "1178": "uf",
    "1179": "sctv",
    "1180": "mcp",
    "1181": "icp",
    "1189": "arb",
    "1190": "scwm",
    "1193": "fa",
    "1194": "ec",
    "1195": "ee",
    "1196": "ccg",
    "1197": "fp",
    "1199": "ccb",
    "1200": "ccs",
    "1201": "cst",
    "1202": "int",
    "1203": "cpd",
    "1208": "py",
    "1213": "em",
    "1217": "or",
    "1218": "ar",
    "1222": "nst",
    "1230": "tspc",
    "1231": "rust",
    "1241": "amc",
    "1243": "act",
    "1244": "cing",
    "1246": "alv",
    "1248": "fi",
    "1253": "fx",
    "1255": "dhc",
    "1256": "vhc",
    "1260": "st",
    "1263": "mfb",
    "1266": "sup",
    "1279": "pm",
    "1280": "mtt",
    "1281": "mtg",
    "1286": "sm",
    "1287": "fr",
    "1288": "hbc",
    "1294": "VL",
    "1296": "SEZ",
    "1297": "chpl",
    "1300": "V3",
    "1301": "AQ",
    "1302": "V4",
    "1303": "V4r"
}