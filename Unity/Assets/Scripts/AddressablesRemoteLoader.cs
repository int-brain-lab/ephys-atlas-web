using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.AddressableAssets.ResourceLocators;
using UnityEngine.Networking;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.ResourceManagement.ResourceLocations;

public class AddressablesRemoteLoader : MonoBehaviour
{
    [SerializeField] private string addressablesStorageRemotePath = "https://data.virtualbrainlab.org/AddressablesStorage";
    [SerializeField] private string buildVersion = "0.2.2";

    private string fileEnding = ".json";
    private string addressablesStorageTargetPath;

    // Server setup task
    private TaskCompletionSource<bool> catalogTargetSetSource;
    private Task<bool> catalogTargetSetTask;

    // Catalog load task
    private static Task catalogLoadedTask;

    // Delaying the load allows you to set the catalog address
    [SerializeField] private bool delayCatalogLoad = false;

    // Start is called before the first frame update
    void Awake()
    {
        //addressablesStorageRemotePath = string.Format("{0}/{1}", addressablesStorageRemotePath, buildVersion);

        //catalogTargetSetSource = new TaskCompletionSource<bool>();
        //catalogTargetSetTask = catalogTargetSetSource.Task;

        //if (!delayCatalogLoad) {
        //    LoadCatalog();
        //}

        // Warning: I think there must be a better way to do this, but because we only initialize this Task
        // in Awake() we **CANNOT** call any of the Load() functions from another classes Awake() function.
        // Technically this is consistent with Unity's Awake/Start architecture, but it's still a little annoying.
        catalogLoadedTask = AsyncLink2Catalog();
    }

    //Register to override WebRequests Addressables creates to download
    private void Start()
    {
        Addressables.WebRequestOverride = EditWebRequestURL;
    }

    //Override the url of the WebRequest, the request passed to the method is what would be used as standard by Addressables.
    private void EditWebRequestURL(UnityWebRequest request)
    {
        if (request.url.Contains("http://"))
            request.url = request.url.Replace("http://", "https://");
        Debug.Log(request.url);
    }

    public void ChangeCatalogServer(string newAddressablesStorageRemotePath) {
        this.addressablesStorageRemotePath = newAddressablesStorageRemotePath;
    }

    //public void LoadCatalog() {
    //    RuntimePlatform platform = Application.platform;
    //    if (platform == RuntimePlatform.WindowsPlayer || platform == RuntimePlatform.WindowsEditor)
    //        addressablesStorageTargetPath = addressablesStorageRemotePath + "/StandaloneWindows64/catalog_" + buildVersion + fileEnding;
    //    else if (platform == RuntimePlatform.WebGLPlayer)
    //        addressablesStorageTargetPath = addressablesStorageRemotePath + "/WebGL/catalog_" + buildVersion + fileEnding;
    //    else if (platform == RuntimePlatform.OSXEditor)
    //        addressablesStorageTargetPath = addressablesStorageRemotePath + "/StandaloneOSX/catalog_" + buildVersion + fileEnding;
    //    else {
    //        Debug.LogError(string.Format("Running on {0} we do NOT have a built Addressables Storage bundle",platform));
    //    }
    //    catalogTargetSetSource.SetResult(true);
    //}

    public Task GetCatalogLoadedTask() {
        return catalogLoadedTask;
    }

    public string GetAddressablesPath()
    {
        return addressablesStorageTargetPath;
    }

    /// <summary>
    /// Load the remote catalog
    /// </summary>
    public async Task<bool> AsyncLink2Catalog()
    {
//        await catalogTargetSetTask;

//#if UNITY_EDITOR
//        Debug.Log("(AddressablesStorage) Loading catalog v" + buildVersion);
//#endif
        bool finished = true;
        //Load a catalog and automatically release the operation handle.
        //Debug.Log("Loading content catalog from: " + GetAddressablesPath());

        //AsyncOperationHandle<IResourceLocator> catalogLoadHandle
        //    = Addressables.LoadContentCatalogAsync(GetAddressablesPath(), true);

        //await catalogLoadHandle.Task;

        //Debug.Log("Content catalog loaded");
        return finished;
    }

    public static async Task<Mesh> LoadCCFMesh(string objPath)
    {
#if UNITY_EDITOR
        Debug.Log("Loading mesh file: " + objPath);
#endif

        // Wait for the catalog to load if this hasn't already happened
        await catalogLoadedTask;


        // Catalog is loaded, load specified mesh file
        string path = "Assets/AddressableAssets/AllenCCF/" + objPath;

        AsyncOperationHandle<Mesh> loadHandle = Addressables.LoadAssetAsync<Mesh>(path);
        await loadHandle.Task;

        return loadHandle.Result;
    }

    public static async Task<string> LoadAllenCCFOntology()
    {
#if UNITY_EDITOR
        Debug.Log("Loading Allen CCF");
#endif

        await catalogLoadedTask;

        string path = "Assets/AddressableAssets/ontology_structure_minimal.csv";

        AsyncOperationHandle loadHandle = Addressables.LoadAssetAsync<TextAsset>(path);
        await loadHandle.Task;

        string returnText = ((TextAsset)loadHandle.Result).text;
        Addressables.Release(loadHandle);

        return returnText;
    }

//    public static async Task<Texture3D> LoadAnnotationTexture()
//    {
//#if UNITY_EDITOR
//        Debug.Log("Loading Allen CCF annotation texture");
//#endif

//        // Wait for the catalog to load if this hasn't already happened
//        await catalogLoadedTask;

//        // Catalog is loaded, load the Texture3D object
//        string path = "Assets/AddressableAssets/Textures/AnnotationDatasetTexture3DAlpha.asset";

//        AsyncOperationHandle loadHandle = Addressables.LoadAssetAsync<Texture3D>(path);
//        await loadHandle.Task;

//        Texture3D returnTexture = (Texture3D)loadHandle.Result;
//        //Addressables.Release(loadHandle);

//        return returnTexture;
//    }

//    public static async Task<byte[]> LoadVolumeIndexes()
//    {
//#if UNITY_EDITOR
//        Debug.Log("Loading volume indexes");
//#endif

//        // Wait for the catalog to load if this hasn't already happened
//        await catalogLoadedTask;

//        string volumePath = "Assets/AddressableAssets/Datasets/volume_indexes.bytes";
        
//        AsyncOperationHandle loadHandle = Addressables.LoadAssetAsync<TextAsset>(volumePath);
//        await loadHandle.Task;

//        byte[] resultText = ((TextAsset)loadHandle.Result).bytes;
//        Addressables.Release(loadHandle);

//        return resultText;
//    }

//    /// <summary>
//    /// Loads the annotation data to be reconstructed by the VolumeDatasetManager
//    /// </summary>
//    /// <returns>List of TextAssets where [0] is the index and [1] is the map</returns>
//    public static async Task<(byte[] index, byte[] map)> LoadAnnotationIndexMap()
//    {
//#if UNITY_EDITOR
//        Debug.Log("Loading annotation index mapping");
//#endif

//        // Wait for the catalog to load if this hasn't already happened
//        await catalogLoadedTask;

//        string annIndexPath = "Assets/AddressableAssets/Datasets/ann/annotation_indexes.bytes";
//        AsyncOperationHandle indexHandle = Addressables.LoadAssetAsync<TextAsset>(annIndexPath);
//        await indexHandle.Task;

//        string annMapPath = "Assets/AddressableAssets/Datasets/ann/annotation_map.bytes";
//        AsyncOperationHandle mapHandle = Addressables.LoadAssetAsync<TextAsset>(annMapPath);
//        await mapHandle.Task;

//        (byte[] index, byte[] map) data = (((TextAsset)indexHandle.Result).bytes, ((TextAsset)mapHandle.Result).bytes );
//        Addressables.Release(indexHandle);
//        Addressables.Release(mapHandle);

//        return data;
//    }
}
