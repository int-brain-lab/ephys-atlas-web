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

#if UNITY_EDITOR
    [SerializeField] private string areasString;
    [SerializeField] private string colorsString;
    [SerializeField] private string visibilityString;
#endif

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
        if (areasString.Length > 0)
            SetAreas(areasString);
        if (colorsString.Length > 0)
            SetColor(colorsString);
        if (visibilityString.Length > 0)
            SetVisibilities(visibilityString);
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
#if UNITY_EDITOR
        Debug.Log(areas);
#endif
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
            string sideStr = area.Substring(0, 1);
            string acronymStr = area.Substring(1, area.Length - 1);

#if UNITY_EDITOR
            Debug.Log($"Searching for {sideStr} {acronymStr}");
#endif

            _areaSideLeft.Add(sideStr == "l");

            CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(acronymStr));
            
            if (node != null)
            {
#if UNITY_EDITOR
                Debug.Log($"Found {acronymStr}");
#endif
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
#if UNITY_EDITOR
        Debug.Log(colors);
#endif
        string[] hexColors = colors.Split(",");

        if (hexColors.Length != _areas.Count)
        {
            Debug.Log("Number of areas set by SetAreas must match number of colors in SetColors");
            return;
        }

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
#if UNITY_EDITOR
        Debug.Log(visibilities);
#endif
        string[] visibility = visibilities.Split(",");
        bool[] visibilityb = visibility.Select(x => bool.Parse(x)).ToArray();

        if (visibility.Length != _areas.Count)
        {
            Debug.Log("Number of areas set by SetVisibilities must match number of colors in SetColors");
            return;
        }

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
