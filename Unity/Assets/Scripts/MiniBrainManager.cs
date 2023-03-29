using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MiniBrainManager : MonoBehaviour
{
    [SerializeField] CCFModelControl _modelControl;
    [SerializeField] AddressablesRemoteLoader _remoteLoader;
    [SerializeField] private BrainCameraController cameraController;

    [SerializeField] private List<string> _materialNames;
    [SerializeField] private List<Material> _materialOpts;

    Dictionary<string, CCFTreeNode> modelNodes;
    private Dictionary<string, Material> _materials;

    private void Awake()
    {
        Debug.Log("Awake");
        //originalTransformPositionsLeft = new Dictionary<int, Vector3>();
        //originalTransformPositionsRight = new Dictionary<int, Vector3>();

        //modelNodes = new();

        //_materials = new();
        //for (int i = 0; i < _materialNames.Count; i++)
        //    _materials.Add(_materialNames[i], _materialOpts[i]);

        //RecomputeCosmosCenters();
        //Debug.Log("Done recomputing centers");
    }

    private async void Start()
    {
        Debug.Log("Start");
        //await _remoteLoader.GetCatalogLoadedTask();

        //Debug.Log("Catalog loaded");
        //_modelControl.LateStart(false);
        //Debug.Log("Model control late start done");

        //await _modelControl.GetDefaultLoadedTask();
        //Debug.Log("Default areas finished");

        //var loadTask = _modelControl.LoadBerylNodes(false, RegisterNode);
        //Debug.Log("Individual areas loading");

        //await loadTask;

        ////foreach (var node in loadTask.Result)
        ////    RegisterNode(node);

        //Debug.Log("Areas loaded");

        //TestAreas();
    }

    private void TestAreas()
    {
        SetColor("VISp:FFFFFF");
        SetColor("VISpl:FFFFFF");
        SetColor("VISpm:FFFFFF");
        SetColor("VISpor:FFFFFF");
    }

    private void Update()
    {
        UpdateExploded();
    }

    /// <summary>
    /// Set an area to a color
    /// </summary>
    /// <param name="areaColor">string of format area_color</param>
    public void SetColor(string areaColor)
    {
        // parse the areaColor string
        int uIdx = areaColor.IndexOf(':');
        string area = areaColor.Substring(0, uIdx);
        string color = areaColor.Substring(uIdx + 1, areaColor.Length - uIdx - 1);

        Debug.Log(area);
        Debug.Log(color);

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(area));
        node.SetColor(ParseHexColor(color));
    }

    public void SetMaterial(string materialStr)
    {
        int uIdx = materialStr.IndexOf(':');
        string area = materialStr.Substring(0, uIdx);
        string material = materialStr.Substring(uIdx + 1, materialStr.Length - uIdx - 1);

        Debug.Log(area);
        Debug.Log(material);

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(area));
        node.SetMaterial(_materials[material]);
    }

    public void RegisterNode(CCFTreeNode node)
    {
        node.SetNodeModelVisibility_Left(true);
        node.SetNodeModelVisibility_Right(true);
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
        Color color = new Color();
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
                int cosmos = _modelControl.GetCosmosID(node.ID);
                Transform nodeTLeft = node.NodeModelLeftGO.transform;
                Transform nodeTright = node.NodeModelRightGO.transform;

                nodeTLeft.localPosition = originalTransformPositionsLeft[node.ID] +
                    cosmosVectors[cosmos] * percentageExploded;

                nodeTright.localPosition = originalTransformPositionsRight[node.ID] +
                        Vector3.Scale(cosmosVectors[cosmos], flipVector) * percentageExploded;
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
