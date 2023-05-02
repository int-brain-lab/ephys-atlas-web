using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using UnityEngine;

public class MiniBrainManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void UnityLoaded();

    [SerializeField] CCFModelControl _modelControl;
    [SerializeField] AddressablesRemoteLoader _remoteLoader;
    [SerializeField] private BrainCameraController cameraController;

    [SerializeField] private List<string> _materialNames;
    [SerializeField] private List<Material> _materialOpts;

    Dictionary<string, CCFTreeNode> modelNodes;
    private Dictionary<string, Material> _materials;

    private List<CCFTreeNode> _areas;
    private List<bool> _areaSideLeft;
    private List<CCFTreeNode> _cosmosAreasSelected;
    private void Awake()
    {
#if !UNITY_EDITOR && UNITY_WEBGL
        WebGLInput.captureAllKeyboardInput = false;
#endif

        originalTransformPositionsLeft = new Dictionary<int, Vector3>();
        originalTransformPositionsRight = new Dictionary<int, Vector3>();
        _cosmosAreasSelected = new();

        _areas = new();
        modelNodes = new();

        _materials = new();
        for (int i = 0; i < _materialNames.Count; i++)
            _materials.Add(_materialNames[i], _materialOpts[i]);

        RecomputeCosmosCenters();
    }

    private async void Start()
    {
        await _remoteLoader.GetCatalogLoadedTask();

        _modelControl.LateStart();

        await _modelControl.GetDefaultLoadedTask();

        var loadTask = _modelControl.LoadBerylNodes(false, RegisterNode);

        await loadTask;


        CCFTreeNode rootNode = _modelControl.GetNode(8);
        rootNode.LoadNodeModel(true, false);
        rootNode.SetMaterial(_materialOpts[_materialNames.IndexOf("transparent-unlit")]);
        rootNode.SetShaderProperty("_Alpha", 0.1f);
        rootNode.SetColor(Color.gray);

#if !UNITY_EDITOR && UNITY_WEBGL
        UnityLoaded();
#endif

#if UNITY_EDITOR
        // Test code
        SetAreas("lPN,lPa4,lPDTg,lVeCB,lPa5,lHATA,lPeF,lVMPO,lIntG,lPoT,lPIL,lXi,lEth,lI5,lPC5,lAcs5,lP5,lMA3,lRPF,lAPr,lProS,lVISpor,lVISli,lVISa,lSSp-un,lIAM,lIAD,lPS,lIA,lPRNc,lCUL4 5,lPRE,lPR,lPPY,lANcr2,lPPT,lGU,lANcr1,lPPN,lFL,lGRN,lPP,lPFL,lGR,lPOST,lCOPY,lGPi,lPOL,lAUDpo,lPRM,lGPe,lPO,lAUDv,lAUDd,lSIM,lPMv,lAUDp,lFS,lMOs,lFN,lMOp,lCENT3,lFC,lPMd,lCENT2,lEW,lPL,lNOD,lEPv,lPIR,lUVU,lEPd,lPYR,lPH,lFOTU,lPGRN,lDEC,lPG,lPF,lENTm,lPERI,lENTl,lLING,lPCN,lECU,lPCG,lECT,lRSPagl,lRSPv,lDTN,lRSPd,lPBG,lDR,lPB,lPAS,lPARN,lDN,lPAR,lDMX,lDMH,lDP,lZI,lPAG,lPAA,ly,lPA,lXII,lx,lVTN,lOT,lVTA,lORBvl,lVPMpc,lVPM,lORBm,lDG,lVPLpc,lORBl,lVPL,lCU,lOP,lVMH,lVLPO,lVM,lCS,lVISC,lCP,lVII,lVI,lNTS,lCOAp,lNTB,lCOAa,lNPC,lVAL,lNOT,lV,lNLOT,lCUN,lTU,lNLL,lSPA,lTTv,lNI,lCM,lTTd,lNDB,lCLI,lCLA,lTRS,lNB,lCL,lTRN,lTR,lMS,lTM,lTEa,lCEA,lSUT,lVISpm,lMPT,lSUM,lMPO,lMPN,lMOB,lSUB,lMM,lMH,lMG,lSTN,lCA3,lMEPO,lSPVO,lSPVI,lSPVC,lVISpl,lCA2,lVISrl,lVISl,lSPF,lMEA,lVISal,lSOC,lMDRN,lVISam,lSO,lVISp,lCA1,lSNr,lSSs,lSNc,lICB,lSSp-ul,lSMT,lPSTN,lMD,lSSp-tr,lSLD,lSSp-n,lBST,lSLC,lSBPV,lSSp-m,lSI,lSFO,lSSp-ll,lSH,lSSp-bfd,lSGN,lSubG,lBMA,lSG,lSF,lMARN,lSCs,lMA,lBLA,lSCm,lBA,lSCH,lB,lAVPV,lSAG,lLSv,lAVP,lRT,lLSr,lAV,lLSc,lRR,lRPO,lLRN,lAT,lRPA,lLPO,lSPIV,lARH,lRO,lLP,lSUV,lAPN,lRN,lLM,lLAV,lAP,lRM,lLIN,lMV,lRL,lLHA,lRH,lLH,lFRP,lRE,lLGv,lNR,lRCH,lLGd,lPRP,lLDT,lAON,lLD,lAOB,lPVT,lLC,lPRNr,lIRN,lAMB,lPVpo,lLA,lMRN,lAM,lPVp,lAIv,lPVi,lIV,lAIp,lISN,lAId,lVCO,lIPN,lDCO,lIP,lAHN,lIO,lDT,lADP,lLT,lAD,lPVHd,lIMD,lMT,lACB,lACAv,lILA,lACAd,lPVH,lIII,lPVa,lIGL,lAAA,lIG,lPT,lIF,lPSV,lIC,rvoid,rIC,rPSV,rIF,rPT,rIG,rAAA,rIGL,rPVa,rIII,rPVH,rACAd,rILA,rACAv,rACB,rMT,rIMD,rPVHd,rAD,rLT,rADP,rDT,rIO,rAHN,rIP,rDCO,rIPN,rVCO,rAId,rISN,rAIp,rIV,rPVi,rAIv,rPVp,rAM,rMRN,rLA,rPVpo,rAMB,rIRN,rPRNr,rLC,rPVT,rAOB,rLD,rAON,rLDT,rPRP,rLGd,rRCH,rNR,rLGv,rRE,rFRP,rLH,rRH,rLHA,rRL,rMV,rLIN,rRM,rAP,rLAV,rLM,rRN,rAPN,rSUV,rLP,rRO,rARH,rSPIV,rLPO,rRPA,rAT,rLRN,rRPO,rRR,rLSc,rAV,rLSr,rRT,rAVP,rLSv,rSAG,rAVPV,rB,rSCH,rBA,rSCm,rBLA,rMA,rSCs,rMARN,rSF,rSG,rBMA,rSubG,rSGN,rSSp-bfd,rSH,rSSp-ll,rSFO,rSI,rSSp-m,rSBPV,rSLC,rBST,rSSp-n,rSLD,rSSp-tr,rMD,rPSTN,rSMT,rSSp-ul,rICB,rSNc,rSSs,rSNr,rCA1,rVISp,rSO,rVISam,rMDRN,rSOC,rVISal,rMEA,rSPF,rVISl,rVISrl,rCA2,rVISpl,rSPVC,rSPVI,rSPVO,rMEPO,rCA3,rSTN,rMG,rMH,rMM,rSUB,rMOB,rMPN,rMPO,rSUM,rMPT,rVISpm,rSUT,rCEA,rTEa,rTM,rMS,rTR,rTRN,rCL,rNB,rTRS,rCLA,rCLI,rNDB,rTTd,rCM,rNI,rTTv,rSPA,rNLL,rTU,rCUN,rNLOT,rV,rNOT,rVAL,rNPC,rCOAa,rNTB,rCOAp,rNTS,rVI,rVII,rCP,rVISC,rCS,rVM,rVLPO,rVMH,rOP,rCU,rVPL,rORBl,rVPLpc,rDG,rORBm,rVPM,rVPMpc,rORBvl,rVTA,rOT,rVTN,rx,rXII,rPA,ry,rPAA,rPAG,rZI,rDP,rDMH,rDMX,rPAR,rDN,rPARN,rPAS,rPB,rDR,rPBG,rRSPd,rDTN,rRSPv,rRSPagl,rECT,rPCG,rECU,rPCN,rLING,rENTl,rPERI,rENTm,rPF,rPG,rDEC,rPGRN,rFOTU,rPH,rPYR,rEPd,rUVU,rPIR,rEPv,rNOD,rPL,rEW,rCENT2,rPMd,rFC,rCENT3,rMOp,rFN,rMOs,rroot,rFS,rAUDp,rPMv,rSIM,rAUDd,rAUDv,rPO,rGPe,rPRM,rAUDpo,rPOL,rGPi,rCOPY,rPOST,rGR,rPFL,rPP,rGRN,rFL,rPPN,rANcr1,rGU,rPPT,rANcr2,rPPY,rPR,rPRE,rCUL4 5,rPRNc,rIA,rPS,rIAD,rIAM,rSSp-un,rVISa,rVISli,rVISpor,rProS,rAPr,rRPF,rMA3,rP5,rAcs5,rPC5,rI5,rEth,rXi,rPIL,rPoT,rIntG,rVMPO,rPeF,rHATA,rPa5,rVeCB,rPDTg,rPa4,rPN");
        SetColors("#FFFFFF,#3F4788,#38588C,#39558C,#2A768E,#2EB37C,#443A83,#FFFFFF,#287C8E,#424186,#3C508B,#482173,#3E4989,#20938C,#2A768E,#FFFFFF,#2E6D8E,#32658E,#38588C,#218F8D,#86D549,#24878E,#20A486,#93D741,#25AC82,#460B5E,#453882,#3B528B,#277E8E,#443A83,#306A8E,#1F998A,#1FA088,#FFFFFF,#20928C,#1FA287,#2B748E,#2C718E,#46327E,#31688E,#3C508B,#228D8D,#2B748E,#FFFFFF,#1E9B8A,#32658E,#3C508B,#2D708E,#1F998A,#24878E,#39558C,#32658E,#26818E,#238A8D,#32658E,#FFFFFF,#20938C,#306A8E,#20928C,#414487,#228D8D,#33638D,#3DBC74,#FFFFFF,#3B528B,#433E85,#29798E,#33638D,#1FA287,#28AE80,#32658E,#1F998A,#31688E,#33638D,#2D708E,#3E4989,#2E6D8E,#33638D,#3D4D8A,#3ABA76,#48C16E,#24AA83,#463480,#28AE80,#3F4788,#472E7C,#20938C,#3DBC74,#28AE80,#482475,#32B67A,#39558C,#3B528B,#3E4989,#24AA83,#31688E,#414487,#24878E,#2C718E,#2C718E,#26828E,#34608D,#3C508B,#24AA83,#481D6F,#25AC82,#8ED645,#3F4788,#39558C,#1F968B,#375B8D,#287C8E,#33638D,#32658E,#24878E,#FDE725,#3C508B,#20A486,#31688E,#1F9E89,#1F9E89,#277E8E,#3F4788,#365D8D,#38588C,#2B748E,#375B8D,#34608D,#FFFFFF,#2A768E,#32B67A,#FFFFFF,#1F9E89,#287C8E,#3B528B,#20A486,#1F968B,#25858E,#3E4989,#306A8E,#39558C,#433E85,#25AC82,#365D8D,#46327E,#20938C,#2C718E,#453882,#33638D,#3B528B,#26828E,#1E9B8A,#433E85,#CAE11F,#2B748E,#FFFFFF,#28AE80,#2E6D8E,#29798E,#5CC863,#20A486,#2D708E,#453882,#433E85,#9BD93C,#3DBC74,#31688E,#20928C,#2D708E,#3F4788,#7FD34E,#26828E,#2B748E,#31688E,#2B748E,#26818E,#73D056,#4CC26C,#48C16E,#443A83,#29798E,#228D8D,#33638D,#31688E,#6ECE58,#FFFFFF,#3DBC74,#BDDF26,#306A8E,#24878E,#31688E,#472E7C,#2A768E,#287C8E,#FFFFFF,#277E8E,#3ABA76,#FFFFFF,#22A785,#482475,#FFFFFF,#FFFFFF,#20A486,#3B528B,#1F968B,#1F998A,#482475,#22A785,#287C8E,#3ABA76,#1E9B8A,#FFFFFF,#306A8E,#453882,#1FA088,#365D8D,#277E8E,#306A8E,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#463480,#443A83,#3F4788,#2E6D8E,#3F4788,#287C8E,#443A83,#38588C,#39558C,#39558C,#3B528B,#FFFFFF,#39558C,#39558C,#FFFFFF,#228D8D,#20938C,#433E85,#2D708E,#38588C,#31688E,#424186,#FFFFFF,#FFFFFF,#3B528B,#3B528B,#375B8D,#414487,#471063,#1F968B,#1FA088,#440154,#20A486,#FFFFFF,#FFFFFF,#1F9E89,#31688E,#46085C,#35B779,#24878E,#22A785,#33638D,#481B6D,#424186,#31688E,#433E85,#FFFFFF,#26818E,#3C508B,#31688E,#FFFFFF,#29798E,#FFFFFF,#FFFFFF,#20928C,#FFFFFF,#2B748E,#375B8D,#306A8E,#3B528B,#3E4989,#3D4D8A,#2D708E,#28AE80,#433E85,#FFFFFF,#FFFFFF,#471063,#2A768E,#26818E,#31688E,#29798E,#2C718E,#24878E,#460B5E,#424186,#FFFFFF,#1F9E89,#24878E,#3C508B,#2C718E,#31688E,#2B748E,#306A8E,#218F8D,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF");
        //SetVisibilities("");
#endif
    }

    private void Update()
    {
        UpdateExploded();
    }

    /// <summary>
    /// Set an area to a color
    /// </summary>
    /// <param name="areaColor">"area_idx:hex_color"</param>
    public void SetColor(string areaColor)
    {
        // parse the areaColor string
        int uIdx = areaColor.IndexOf(':');
        //int areaIdx = int.Parse(areaColor.Substring(0, uIdx), System.Globalization.NumberStyles.Any);
        string areaStr = areaColor.Substring(0, uIdx);
        string color = areaColor.Substring(uIdx + 1, areaColor.Length - uIdx - 1);

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(areaStr));

        node.SetColor(ParseHexColor(color));
    }

    public void SetMaterial(string materialStr)
    {
        int uIdx = materialStr.IndexOf(':');
        int areaIdx = int.Parse(materialStr.Substring(0, uIdx), System.Globalization.NumberStyles.Any);
        string material = materialStr.Substring(uIdx + 1, materialStr.Length - uIdx - 1);

        CCFTreeNode node = _modelControl.GetNode(areaIdx);
        node.SetMaterial(_materials[material]);
    }

    public void SetVisibility(string visibleStr)
    {
        int uIdx = visibleStr.IndexOf(':');
        string areaStr = visibleStr.Substring(0, uIdx);
        bool visible = bool.Parse(visibleStr.Substring(uIdx + 1, visibleStr.Length - uIdx - 1));

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(areaStr));
        node.SetNodeModelVisibility_Left(visible);
        node.SetNodeModelVisibility_Right(visible);
    }

    public void SetVisibilityLeft(string visibleStr)
    {
        int uIdx = visibleStr.IndexOf(':');
        string areaStr = visibleStr.Substring(0, uIdx);
        bool visible = bool.Parse(visibleStr.Substring(uIdx + 1, visibleStr.Length - uIdx - 1));

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(areaStr));
        node.SetNodeModelVisibility_Left(visible);
    }

    public void SetVisibilityRight(string visibleStr)
    {
        int uIdx = visibleStr.IndexOf(':');
        string areaStr = visibleStr.Substring(0, uIdx);
        bool visible = bool.Parse(visibleStr.Substring(uIdx + 1, visibleStr.Length - uIdx - 1));

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(areaStr));
        node.SetNodeModelVisibility_Right(visible);
    }

#region Plural
    /// <summary>
    /// Set the list of areas that will be re-used when setting plural colors or visibilities
    /// </summary>
    /// <param name="areas"></param>
    public void SetAreas(string areas)
    {
        foreach (CCFTreeNode node in _areas)
        {
            node.SetNodeModelVisibility_Left(false);
            node.SetNodeModelVisibility_Right(false);
        }

        _areas = new();
        _areaSideLeft = new();

        string[] areaAcronyms = areas.Split(",");


        foreach (string area in areaAcronyms)
        {
            _areaSideLeft.Add(area.Substring(0, 1) == "l");

            CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(area.Substring(1, area.Length - 1)));
            
            if (node != null)
            {
                // reset color
                node.SetColor(node.DefaultColor);

                if (_areaSideLeft[^1])
                {
                    // default to default color
                    node.SetNodeModelVisibility_Left(true);
                }
                else
                {
                    node.SetNodeModelVisibility_Right(true);
                }
            }
            _areas.Add(node);
        }
    }

    public void SetColors(string colors)
    {
        string[] hexColors = colors.Split(",");

        if (hexColors.Length != _areas.Count)
            throw new System.Exception("Number of areas set by SetAreas must match number of colors in SetColors");

        for (int i = 0; i < hexColors.Length; i++)
        {
            if (_areas[i] != null)
            {
                if (hexColors[i].Equals("-"))
                    _areas[i].SetColorOneSided(_areas[i].DefaultColor, _areaSideLeft[i]);
                else
                    _areas[i].SetColorOneSided(ParseHexColor(hexColors[i]), _areaSideLeft[i]);
            }
        }
    }

    public void SetVisibilities(string visibilities)
    {
        string[] visibility = visibilities.Split(",");
        bool[] visibilityb = visibility.Select(x => bool.Parse(x)).ToArray();

        if (visibility.Length != _areas.Count)
            throw new System.Exception("Number of areas set by SetVisibilities must match number of colors in SetColors");

        // some areas are selected
        if (_anySelected)
        {
            _cosmosAreasSelected.Clear();
        }

        for (int i = 0; i < visibility.Length; i++)
        {
            if (_areas[i] != null)
            {
                if (_anySelected && visibilityb[i])
                {
                    CCFTreeNode cosmosArea = _modelControl.GetNode(_modelControl.GetCosmosID(_areas[i].ID));
                    if (!_cosmosAreasSelected.Contains(cosmosArea))
                        _cosmosAreasSelected.Add(cosmosArea);
                }
                if (_areaSideLeft[i])
                    _areas[i].SetNodeModelVisibility_Left(visibilityb[i]);
                else
                    _areas[i].SetNodeModelVisibility_Right(visibilityb[i]);
            }
        }

        if (_anySelected && percentageExploded != 0)
        {
            // make the cosmos areas visible
            foreach (CCFTreeNode node in _cosmosAreasSelected)
            {
                node.SetNodeModelVisibility_Left(true);
                node.SetNodeModelVisibility_Right(true);
            }
        }
        else
        {
            // hide your kids
            foreach (int ID in cosmosIDs)
            {
                CCFTreeNode node = _modelControl.GetNode(ID);

                node.SetNodeModelVisibility_Left(false);
                node.SetNodeModelVisibility_Right(false);
            }
        }
    }

    #endregion

    #region Cosmos transparency
    private bool _anySelected;
    private int[] cosmosIDs = { 313, 315, 512, 549, 623, 698, 703, 1065, 1089, 1097 };

    public void AreaSelected(int selected)
    {
        // Anytime areas are selected we need to show either the root node, or the cosmos nodes that are parents
        // of the current visible nodes
        _anySelected = selected == 1;

        if (percentageExploded == 0)
        {
            // show the full root node
            _modelControl.GetNode(8).SetNodeModelVisibility_Full(_anySelected);
            // hide the cosmos nodes
            foreach (int ID in cosmosIDs)
            {
                CCFTreeNode node = _modelControl.GetNode(ID);

                node.SetNodeModelVisibility_Left(false);
                node.SetNodeModelVisibility_Right(false);
            }
        }
        else
        {
            // Set the cosmos nodes to be transparent and light grey
            foreach (int cosmosID in cosmosIDs)
            {
                CCFTreeNode cosmoNode = _modelControl.GetNode(cosmosID);
                if (_anySelected)
                {
                    cosmoNode.SetMaterial(_materialOpts[_materialNames.IndexOf("transparent-unlit")]);
                    cosmoNode.SetShaderProperty("_Alpha", 0.1f);
                    cosmoNode.SetColor(Color.gray);
                }
                else
                {
                    cosmoNode.SetMaterial(_materialOpts[_materialNames.IndexOf("opaque-lit")]);
                    cosmoNode.SetShaderProperty("_Alpha", 1.0f);
                    cosmoNode.SetColor(cosmoNode.DefaultColor);
                }
            }
        }
    }

    #endregion

    public void RegisterNode(CCFTreeNode node)
    {
#if UNITY_EDITOR
        Debug.Log($"Registering {node.ShortName}");
#endif
        node.SetNodeModelVisibility_Left(false);
        node.SetNodeModelVisibility_Right(false);
        node.SetShaderProperty("_Alpha", 1f);
        
        modelNodes.Add(node.ShortName, node);

        if (node != null && node.NodeModelLeftGO != null)
        {
            if (!originalTransformPositionsLeft.ContainsKey(node.ID))
                originalTransformPositionsLeft.Add(node.ID, node.NodeModelLeftGO.transform.localPosition);
            if (!originalTransformPositionsRight.ContainsKey(node.ID))
                originalTransformPositionsRight.Add(node.ID, node.NodeModelRightGO.transform.localPosition);
        }
    }

    public static Color ParseHexColor(string hexString)
    {
        Color color;
        ColorUtility.TryParseHtmlString(hexString, out color);
        return color;
    }

#region explosions

    //    // Exploding
    [Range(0,1), SerializeField] private float percentageExploded = 0f;
    private float prevPerc = 0f;
    private bool explodeLeftOnly;
    private bool exploded;
    public bool colorLeftOnly { get; private set; }

    private int[] cosmos = { 315, 698, 1089, 703, 623, 549, 1097, 313, 1065, 512 };
    private Dictionary<int, Vector3> cosmosMeshCenters;
    private Dictionary<int, Vector3> originalTransformPositionsLeft;
    private Dictionary<int, Vector3> originalTransformPositionsRight;
    private Dictionary<int, Vector3> cosmosVectors;
    [SerializeField] private GameObject parentGO;

    public void SetPercentageExploded(float perc)
    {
        percentageExploded = Mathf.Clamp(perc, 0f, 1f);
    }

    private void UpdateExploded()
    {
        if (percentageExploded != prevPerc)
        {
            prevPerc = percentageExploded;

            cameraController.SetControlBlock(true);

            Vector3 flipVector = new Vector3(1f, 1f, -1f);
            foreach (CCFTreeNode node in modelNodes.Values)
            {
                int cosmosID = _modelControl.GetCosmosID(node.ID);
                if (cosmosVectors.ContainsKey(cosmosID) && node.NodeModelLeftGO != null)
                {
                    Transform nodeTLeft = node.NodeModelLeftGO.transform;
                    Transform nodeTright = node.NodeModelRightGO.transform;

                    Vector3 coord = cosmosVectors[cosmosID];

                    nodeTLeft.localPosition = originalTransformPositionsLeft[node.ID] +
                        coord * percentageExploded;

                    nodeTright.localPosition = originalTransformPositionsRight[node.ID] +
                            Vector3.Scale(coord, flipVector) * percentageExploded;
                }
            }
        }
    }

    private void RecomputeCosmosCenters()
    {
        parentGO.SetActive(true);

        cosmosMeshCenters = new Dictionary<int, Vector3>();
        cosmosVectors = new Dictionary<int, Vector3>();

        // save the cosmos transform positions
        foreach (int cosmosID in cosmos)
        {
            GameObject cosmosGO = parentGO.transform.Find(cosmosID + "L").gameObject;
            cosmosMeshCenters.Add(cosmosID, cosmosGO.GetComponentInChildren<Renderer>().bounds.center);
            cosmosGO.SetActive(false);

            cosmosVectors.Add(cosmosID, cosmosGO.transform.localPosition);
        }

        parentGO.SetActive(false);
    }
#endregion
}
