using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MiniBrainManager : MonoBehaviour
{
    [SerializeField] CCFModelControl _modelControl;

    /// <summary>
    /// Set an area to a color
    /// </summary>
    /// <param name="areaColor">string of format area_color</param>
    public void SetColor(string areaColor)
    {
        // parse the areaColor string
        int uIdx = areaColor.IndexOf('_');
        string area = areaColor.Substring(0, uIdx);
        string color = areaColor.Substring(uIdx + 1, areaColor.Length - uIdx - 1);

        Debug.Log(area);
        Debug.Log(color);

        CCFTreeNode node = _modelControl.GetNode(_modelControl.Acronym2ID(area));
        node.SetColor(ParseHexColor(color));
    }

    public static Color ParseHexColor(string hexString)
    {
        Color color = new Color();
        ColorUtility.TryParseHtmlString(hexString, out color);
        return color;
    }
}
